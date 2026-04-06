/**
 * Utility for cleaning and normalizing data from spreadsheets.
 * Handles encoding, dates, currencies, phones, CPFs, and text normalization.
 */

/**
 * Fixes common encoding issues (e.g., Latin-1 characters interpreted as UTF-8)
 * and removes unwanted special characters.
 */
export function cleanText(text: string | null | undefined): string {
  if (!text) return "";
  
  let cleaned = String(text).trim();

  // Common encoding fixes for Portuguese (UTF-8 interpreted as ISO-8859-1/Windows-1252)
  const replacements: Record<string, string> = {
    "Ã¡": "á", "Ã ": "à", "Ã¢": "â", "Ã£": "ã",
    "Ã©": "é", "Ã¨": "è", "Ãª": "ê",
    "Ã­": "í", "Ã¬": "ì", "Ã®": "î",
    "Ã³": "ó", "Ã²": "ò", "Ã´": "ô", "Ãµ": "õ",
    "Ãº": "ú", "Ã¹": "ù", "Ã»": "û",
    "Ã§": "ç",
    "Ã": "Á", "Ã€": "À", "Ã‚": "Â", "Ãƒ": "Ã",
    "Ã‰": "É", "Ãˆ": "È", "ÃŠ": "Ê",
    "Ã": "Í", "ÃŒ": "Ì", "ÃŽ": "Î",
    "Ã“": "Ó", "Ã’": "Ò", "Ã”": "Ô", "Ã•": "Õ",
    "Ãš": "Ú", "Ã™": "Ù", "Ã›": "Û",
    "Ã‡": "Ç",
    "": "", // Remove replacement characters if they persist
  };

  // Apply replacements for known broken characters
  Object.entries(replacements).forEach(([bad, good]) => {
    cleaned = cleaned.split(bad).join(good);
  });

  // Remove any remaining non-printable characters or weird symbols that shouldn't be in names
  cleaned = cleaned.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '');

  return cleaned;
}

/**
 * Normalizes CPF to 11 digits (removes dots, dashes, and adds leading zeros)
 */
export function normalizeCPF(cpf: string | null | undefined): string {
  if (!cpf) return "";
  const digits = String(cpf).replace(/\D/g, "");
  return digits.padStart(11, "0").slice(0, 11);
}

/**
 * Normalizes phone numbers to a standard format (removes non-digits)
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return String(phone).replace(/\D/g, "");
}

/**
 * Parses currency strings into numbers.
 * Handles: "R$ 1.222,45", "1.222,45", "1222.45", "R$1222", etc.
 */
export function parseCurrency(value: any): number {
  if (typeof value === "number") return value;
  if (!value) return 0;

  let str = String(value).trim();
  
  // Remove "R$" and spaces
  str = str.replace(/R\$/g, "").replace(/\s/g, "");

  // Detect if it's using comma as decimal separator (Brazilian style)
  // If there's a comma and it's after a dot, or if there's only a comma
  if (str.includes(",") && (str.indexOf(",") > str.indexOf(".") || !str.includes("."))) {
    // Brazilian format: 1.222,45 -> 1222.45
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",") && str.includes(".")) {
    // International format: 1,222.45 -> 1222.45
    str = str.replace(/,/g, "");
  }

  const result = parseFloat(str);
  return isNaN(result) ? 0 : result;
}

/**
 * Parses various date formats into ISO strings or Date objects.
 * Handles: dd/mm/aaaa, dd-mm-aaaa, d/m/aa, etc.
 */
export function parseDate(dateStr: any): string {
  if (!dateStr) return "";
  if (dateStr instanceof Date) return dateStr.toISOString();

  const str = String(dateStr).trim();
  
  // Try to split by common separators
  const parts = str.split(/[/\-.]/);
  
  if (parts.length === 3) {
    let day = parseInt(parts[0]);
    let month = parseInt(parts[1]);
    let year = parseInt(parts[2]);

    // Handle 2-digit years
    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }

    // Basic validation
    if (day > 0 && day <= 31 && month > 0 && month <= 12) {
      // Return as YYYY-MM-DD for consistency
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Fallback to native parsing if it looks like a valid date string
  const fallback = new Date(str);
  return !isNaN(fallback.getTime()) ? fallback.toISOString().split('T')[0] : str;
}

/**
 * Full row normalization for a "Client" or "Contract" object
 */
export function normalizeData(data: any): any {
  const normalized = { ...data };

  if (normalized.nome) normalized.nome = cleanText(normalized.nome).toUpperCase();
  if (normalized.cpf) normalized.cpf = normalizeCPF(normalized.cpf);
  if (normalized.telefone) normalized.telefone = normalizePhone(normalized.telefone);
  if (normalized.celular) normalized.celular = normalizePhone(normalized.celular);
  if (normalized.dataNascimento) normalized.dataNascimento = parseDate(normalized.dataNascimento);
  if (normalized.parcela) normalized.parcela = parseCurrency(normalized.parcela);
  if (normalized.valor) normalized.valor = parseCurrency(normalized.valor);
  
  return normalized;
}
