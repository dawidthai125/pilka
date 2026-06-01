export function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
