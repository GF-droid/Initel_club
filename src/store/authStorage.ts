/**
 * The single place that owns how a signed-in session is persisted.
 *
 * It lives on its own so that neither the axios instance nor the Pinia store has
 * to import the other: the store imports axios, and axios needs to read the
 * token, which would otherwise be a circular import.
 */

export const ACCESS_TOKEN_KEY = 'accessToken';
export const USER_KEY = 'user';

export interface StoredUser {
  id: number;
  username: string;
  email: string | null;
}

/**
 * Reads `exp` out of a JWT so an obviously dead token is not sent at all.
 * The signature is NOT checked here — the API remains the authority.
 */
const isExpired = (token: string): boolean => {
  try {
    const part = token.split('.')[1];
    if (!part) return false;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    // Undecodable token: let the API answer 401 instead of guessing here.
    return false;
  }
};

/** Returns a usable token, clearing the stored session when it has expired. */
export const readToken = (): string | null => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;
  if (isExpired(token)) {
    clearAuthStorage();
    return null;
  }
  return token;
};

export const readUser = (): StoredUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
};

export const writeAuthStorage = (user: StoredUser, token: string): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const clearAuthStorage = (): void => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
};
