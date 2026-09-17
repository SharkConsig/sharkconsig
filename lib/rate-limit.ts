// Rate limiter em memória eficiente para rotas públicas
// Otimizado para economia de recursos e prevenção contra força bruta / robôs

interface RateLimitRecord {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Limpeza periódica leve para liberar memória de buckets expirados
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, val] of rateLimitStore.entries()) {
      if (now > val.resetAt) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
  if (timer.unref) timer.unref()
}

export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60 * 1000
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now()
  const current = rateLimitStore.get(identifier)

  if (!current || now > current.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1, reset: now + windowMs }
  }

  if (current.count >= limit) {
    return { success: false, remaining: 0, reset: current.resetAt }
  }

  current.count += 1
  return { success: true, remaining: limit - current.count, reset: current.resetAt }
}
