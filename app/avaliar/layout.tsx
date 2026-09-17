import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Acerto Fácil",
  description: "Processo Seletivo",
  openGraph: {
    title: "Acerto Fácil",
    description: "Processo Seletivo",
    siteName: "Acerto Fácil",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Acerto Fácil",
    description: "Processo Seletivo",
  },
}

export default function AvaliarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
