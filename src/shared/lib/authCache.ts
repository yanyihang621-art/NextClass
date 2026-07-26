import type { User } from '@supabase/supabase-js';

export const CACHED_AUTH_USER_KEY = 'nextclass_cached_auth_user';

interface AuthStorage {
  readonly length: number;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
}

interface InitialAuthState {
  user: User | null;
  loading: boolean;
}

function getBrowserStorage(): AuthStorage | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function isCachedUser(value: unknown): value is User {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { id?: unknown }).id === 'string'
    && (value as { id: string }).id.length > 0;
}

function parseStoredUser(raw: string | null): User | null {
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    return isCachedUser(value) ? value : null;
  } catch {
    return null;
  }
}

function readSupabaseCachedUser(storage: AuthStorage): User | null {
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !/^sb-.+-auth-token$/.test(key)) continue;

    try {
      const storedSession: unknown = JSON.parse(storage.getItem(key) ?? 'null');
      const session = Array.isArray(storedSession) ? storedSession[0] : storedSession;
      if (typeof session !== 'object' || session === null) continue;

      const candidate = (session as { user?: unknown }).user;
      if (isCachedUser(candidate)) return candidate;
    } catch {
      // Ignore malformed or obsolete Supabase storage entries.
    }
  }

  return null;
}

export function readCachedAuthUser(storage: AuthStorage | undefined = getBrowserStorage()): User | null {
  if (!storage) return null;

  try {
    const appCachedUser = parseStoredUser(storage.getItem(CACHED_AUTH_USER_KEY));
    if (appCachedUser) return appCachedUser;

    // One-time migration path for users who already have a persisted Supabase
    // session but have not launched a build containing the NextClass cache yet.
    const supabaseCachedUser = readSupabaseCachedUser(storage);
    if (supabaseCachedUser) writeCachedAuthUser(supabaseCachedUser, storage);
    return supabaseCachedUser;
  } catch {
    // Some WebViews expose localStorage but deny reads (for example in a
    // restricted/private storage mode). Falling back to normal auth startup is
    // safer than failing the whole React render.
    return null;
  }
}

export function writeCachedAuthUser(
  user: User,
  storage: AuthStorage | undefined = getBrowserStorage(),
): void {
  if (!storage) return;

  try {
    storage.setItem(CACHED_AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    // Authentication remains functional if storage is unavailable or full.
  }
}

export function clearCachedAuthUser(storage: AuthStorage | undefined = getBrowserStorage()): void {
  if (!storage) return;

  try {
    storage.removeItem(CACHED_AUTH_USER_KEY);
  } catch {
    // Ignore storage failures during sign-out/session invalidation.
  }
}

export function createInitialAuthState(
  storage: AuthStorage | undefined = getBrowserStorage(),
): InitialAuthState {
  const user = readCachedAuthUser(storage);
  return {
    user,
    loading: user === null,
  };
}
