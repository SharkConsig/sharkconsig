import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Acerto Fácil",
  description: "Processo Seletivo",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
}

export default function AvaliarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
