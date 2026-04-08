"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace("/")
      }
    }
    checkSession()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      // Redireciona para importar usando router para melhor UX
      router.push("/importar")
      
      // Fallback: se em 5 segundos não mudar de página, libera o botão
      setTimeout(() => {
        setIsLoading(false)
      }, 5000)
    } catch (err: any) {
      console.error("Erro de login:", err)
      setError(err.message || "Ocorreu um erro inesperado.")
      setIsLoading(false)
    }
  }

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 lg:p-8">
      <Card className="w-full max-w-[324px] border border-slate-200 card-shadow">
        <CardContent className="p-6 lg:p-10 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-48 h-12">
              <Image 
                src="/logo.png" 
                alt="SharkConsig Logo" 
                fill 
                className="object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center">
                  {error}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#7E97B8] uppercase tracking-widest ml-1">
                E-MAIL
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0F172A]" />
                <Input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com" 
                  className="h-[45px] pl-11 text-[14px] font-medium bg-[#EBF3FF] border-none rounded-2xl text-slate-700 placeholder:text-[#7E97B8] focus-visible:ring-2 focus-visible:ring-blue-100 transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#7E97B8] uppercase tracking-widest ml-1">
                SENHA
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0F172A]" />
                <Input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="........" 
                  className="h-[45px] pl-11 pr-11 text-[17px] font-medium bg-[#EBF3FF] border-none rounded-2xl text-slate-700 placeholder:text-[#7E97B8] focus-visible:ring-2 focus-visible:ring-blue-100 transition-all shadow-sm"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7E97B8]/40 hover:text-[#7E97B8] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full h-[45px] bg-[#0F172A] hover:bg-[#1e293b] text-white text-[13px] font-extrabold uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-[0.98]"
            >
              {isLoading ? "ENTRANDO..." : "ENTRAR"}
            </Button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-[10px] text-slate-400">
              Esqueceu sua senha? <Link href="#" className="font-bold text-slate-900 hover:underline">Clique aqui</Link>
            </p>
          </div>

          <div className="pt-6 border-t border-slate-50 text-center">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
              © 2026 SHARKCONSIG • V2.4.1
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
