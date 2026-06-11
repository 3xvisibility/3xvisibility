/**
 * Normalizes an email address for authentication by trimming
 * surrounding whitespace and lowercasing it. Use this everywhere
 * an email is sent to auth (login, signup, password reset).
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Pragmatic email format check: non-empty local part, single @, domain with a dot.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Returns true when the (normalized) email is a non-empty, validly formatted address.
 */
export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && normalized.length <= 255 && EMAIL_REGEX.test(normalized);
}
