export function mapStr(row: Record<string, unknown>, key: string): string {
  return String(row[key] ?? "");
}

export function mapNullableStr(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return value == null ? null : String(value);
}

export function mapOptStr(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return value == null || value === "" ? null : String(value);
}

export function mapNum(row: Record<string, unknown>, key: string): number {
  return Number(row[key] ?? 0);
}

export function mapOptNum(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  return value == null ? null : Number(value);
}

export function mapBool(row: Record<string, unknown>, key: string): boolean {
  return Boolean(row[key]);
}

export function mapJsonObj(row: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = row[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
