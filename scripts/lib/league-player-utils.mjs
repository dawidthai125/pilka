/** Wspólne helpery dopasowania nazwisk ligowych (regiowyniki: „Nazwisko Imię”). */

export function normalizeName(name) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseLeaguePlayerName(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return { lastName: parts[0] ?? "", firstName: "" };
  return { lastName: parts[0], firstName: parts.slice(1).join(" ") };
}
