export function sanitizeIlikeTerm(term: string): string {
  return term.replace(/[%_,().\\]/g, " ").trim().slice(0, 100);
}
