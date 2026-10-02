/**
 * Remove acentos e normaliza para busca insensível a maiúsculas e diacríticos
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Extrai um trecho relevante do texto correspondente à busca
 */
export function extractSnippet(fullText: string, query: string, maxLength: number = 140): string {
  if (!fullText) return '';
  if (!query) {
    return fullText.length > maxLength ? fullText.slice(0, maxLength) + '...' : fullText;
  }

  const normalizedFull = normalizeText(fullText);
  const normalizedQuery = normalizeText(query);
  const index = normalizedFull.indexOf(normalizedQuery);

  if (index === -1) {
    return fullText.length > maxLength ? fullText.slice(0, maxLength) + '...' : fullText;
  }

  const start = Math.max(0, index - 40);
  const end = Math.min(fullText.length, index + query.length + 80);

  let snippet = fullText.slice(start, end).replace(/\r?\n+/g, ' ');
  if (start > 0) snippet = '...' + snippet;
  if (end < fullText.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Formata número com zeros à esquerda (ex: 1 -> "001")
 */
export function formatHinoNumero(numero: number): string {
  return numero.toString().padStart(3, '0');
}
