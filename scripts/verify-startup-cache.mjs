import assert from 'node:assert/strict';
import {
  CACHED_AUTH_USER_KEY,
  clearCachedAuthUser,
  createInitialAuthState,
  writeCachedAuthUser,
} from '../src/shared/lib/authCache.ts';

class MemoryStorage {
  #values = new Map();

  get length() {
    return this.#values.size;
  }

  key(index) {
    return Array.from(this.#values.keys())[index] ?? null;
  }

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}

const cachedUser = {
  id: 'cached-user-id',
  email: 'cached@example.com',
  email_confirmed_at: '2026-07-26T00:00:00.000Z',
};

const emptyStorage = new MemoryStorage();
assert.deepEqual(createInitialAuthState(emptyStorage), {
  user: null,
  loading: true,
});

const nextClassStorage = new MemoryStorage();
writeCachedAuthUser(cachedUser, nextClassStorage);
assert.deepEqual(createInitialAuthState(nextClassStorage), {
  user: cachedUser,
  loading: false,
});
clearCachedAuthUser(nextClassStorage);
assert.equal(nextClassStorage.getItem(CACHED_AUTH_USER_KEY), null);

const supabaseStorage = new MemoryStorage();
supabaseStorage.setItem('sb-nextclass-auth-token', JSON.stringify({
  access_token: 'do-not-copy-this-token',
  user: cachedUser,
}));
assert.deepEqual(createInitialAuthState(supabaseStorage), {
  user: cachedUser,
  loading: false,
});
assert.deepEqual(JSON.parse(supabaseStorage.getItem(CACHED_AUTH_USER_KEY)), cachedUser);

const malformedStorage = new MemoryStorage();
malformedStorage.setItem(CACHED_AUTH_USER_KEY, '{not-json');
malformedStorage.setItem('sb-nextclass-auth-token', JSON.stringify({ user: { email: 'missing-id@example.com' } }));
assert.deepEqual(createInitialAuthState(malformedStorage), {
  user: null,
  loading: true,
});

const inaccessibleStorage = {
  get length() { throw new Error('storage disabled'); },
  getItem() { throw new Error('storage disabled'); },
  setItem() { throw new Error('storage disabled'); },
  removeItem() { throw new Error('storage disabled'); },
  key() { throw new Error('storage disabled'); },
};
assert.deepEqual(createInitialAuthState(inaccessibleStorage), {
  user: null,
  loading: true,
});

console.log('startup cache verification passed');
