const isBrowser = typeof window !== "undefined";

// In-memory fallback dictionaries for environments where storage is blocked (e.g. insecure local network origins)
const memoryStorage: Record<string, string> = {};
const memorySessionStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    if (!isBrowser) return null;
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] localStorage.getItem failed for key "${key}". Using in-memory fallback.`, e);
      return memoryStorage[key] || null;
    }
  },

  setItem(key: string, value: string): void {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[SafeStorage] localStorage.setItem failed for key "${key}". Using in-memory fallback.`, e);
      memoryStorage[key] = value;
    }
  },

  removeItem(key: string): void {
    if (!isBrowser) return;
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] localStorage.removeItem failed for key "${key}".`, e);
      delete memoryStorage[key];
    }
  }
};

export const safeSessionStorage = {
  getItem(key: string): string | null {
    if (!isBrowser) return null;
    try {
      return window.sessionStorage.getItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] sessionStorage.getItem failed for key "${key}". Using in-memory fallback.`, e);
      return memorySessionStorage[key] || null;
    }
  },

  setItem(key: string, value: string): void {
    if (!isBrowser) return;
    try {
      window.sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[SafeStorage] sessionStorage.setItem failed for key "${key}". Using in-memory fallback.`, e);
      memorySessionStorage[key] = value;
    }
  },

  removeItem(key: string): void {
    if (!isBrowser) return;
    try {
      window.sessionStorage.removeItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] sessionStorage.removeItem failed for key "${key}".`, e);
      delete memorySessionStorage[key];
    }
  }
};
