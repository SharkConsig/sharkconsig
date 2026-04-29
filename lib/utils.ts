import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; name?: string; code?: string };
    const isNetworkError = 
      !error.status || // No status often means network failure
      error.message?.includes('fetch') || 
      error.message?.includes('NetworkError') || 
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('TypeError') ||
      error.code === 'PGRST301' || // JWT expired (sometimes retry helps if it's a glitch)
      error.code === 'ECONNRESET';

    if (retries > 0 && isNetworkError) {
      console.warn(`[RETRY] Falha na rede (${error.message || error.code}), tentando novamente em ${delay}ms... (${retries} tentativas restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toUpperCase()
    .trim();
}
