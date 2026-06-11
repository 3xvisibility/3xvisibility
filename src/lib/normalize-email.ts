/**
 * Normalizes an email address for authentication by trimming
 * surrounding whitespace and lowercasing it. Use this everywhere
 * an email is sent to auth (login, signup, password reset).
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
