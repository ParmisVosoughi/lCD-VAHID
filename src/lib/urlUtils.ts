// Shared URL validation helpers (http/https only).
export function isValidHttpUrl(value: string | null | undefined): boolean {
  const v = (value ?? '').trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
