import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/avaliar")) {
    const userAgent = request.headers.get("user-agent") || ""
    // Bloquear apenas crawlers que geram preview no WhatsApp/Meta sem afetar navegadores reais (mesmo webviews com Mozilla/5.0)
    const isBot =
      /facebookexternalhit|Facebot/i.test(userAgent) ||
      (/^WhatsApp\//i.test(userAgent) && !userAgent.includes("Mozilla/"))

    if (isBot) {
      return new NextResponse(null, { status: 404 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/avaliar/:path*"],
}
