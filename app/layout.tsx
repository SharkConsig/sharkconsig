import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/context/auth-context"
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'})

export const metadata: Metadata = {
  title: "SharkConsig",
  description: "Sistema de Gestão de Crédito Consignado",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  )
}
