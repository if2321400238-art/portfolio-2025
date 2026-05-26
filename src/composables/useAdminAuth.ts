import { readonly, ref } from "vue";
import { apiUrl, setCsrfToken } from "./useProjectApi";

export type AdminAuthState = "idle" | "checking" | "authenticated" | "unauthenticated";

const stateRef = ref<AdminAuthState>("idle");
const userRef = ref<{ username: string } | null>(null);
const errorRef = ref("");

const DEFAULT_TIMEOUT_MS = 15000;

function mapAuthError(status: number) {
  if (status === 401) return "Username atau password salah.";
  if (status === 429) return "Terlalu banyak percobaan.";
  if (status >= 500) return "Terjadi kesalahan server.";
  return "Terjadi kesalahan server.";
}

async function safeFetch(path: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(apiUrl(path), {
      ...init,
      credentials: "include",
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function fetchSessionCsrf() {
  try {
    const response = await safeFetch("/api/auth/session", {
      method: "GET",
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { csrfToken?: string };
    return typeof data?.csrfToken === "string" ? data.csrfToken : null;
  } catch {
    return null;
  }
}

export function useAdminAuth() {
  const checkAuth = async () => {
    stateRef.value = "checking";
    errorRef.value = "";

    try {
      const response = await safeFetch("/api/auth/me", {
        method: "GET",
      });

      if (response.ok) {
        const data = (await response.json()) as { username?: string };
        userRef.value = data?.username ? { username: data.username } : { username: "admin" };
        const token = await fetchSessionCsrf();
        setCsrfToken(token);
        stateRef.value = "authenticated";
        return true;
      }

      if (response.status === 401) {
        userRef.value = null;
        stateRef.value = "unauthenticated";
        return false;
      }

      errorRef.value = mapAuthError(response.status);
      userRef.value = null;
      stateRef.value = "unauthenticated";
      return false;
    } catch {
      errorRef.value = "Terjadi kesalahan server.";
      userRef.value = null;
      stateRef.value = "unauthenticated";
      return false;
    }
  };

  const login = async (username: string, password: string) => {
    stateRef.value = "checking";
    errorRef.value = "";

    try {
      const response = await safeFetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const message = mapAuthError(response.status);
        errorRef.value = message;
        stateRef.value = "unauthenticated";
        userRef.value = null;
        throw message;
      }

      const data = (await response.json()) as { username?: string };
      userRef.value = data?.username ? { username: data.username } : { username };
      const token = await fetchSessionCsrf();
      setCsrfToken(token);
      stateRef.value = "authenticated";
      return true;
    } catch (error) {
      const message = typeof error === "string" ? error : "Terjadi kesalahan server.";
      errorRef.value = message;
      stateRef.value = "unauthenticated";
      userRef.value = null;
      throw message;
    }
  };

  const logout = async () => {
    try {
      const response = await safeFetch("/api/auth/session", {
        method: "GET",
      });

      if (response.ok) {
        const data = (await response.json()) as { csrfToken?: string };
        if (data?.csrfToken) {
          await safeFetch("/api/auth/logout", {
            method: "POST",
            headers: {
              "X-CSRF-Token": data.csrfToken,
            },
          });
        } else {
          await safeFetch("/api/auth/logout", {
            method: "POST",
          });
        }
      } else {
        await safeFetch("/api/auth/logout", {
          method: "POST",
        });
      }
    } catch {
      // Ignore logout failures
    }

    userRef.value = null;
    errorRef.value = "";
    setCsrfToken(null);
    stateRef.value = "unauthenticated";
  };

  return {
    state: readonly(stateRef),
    user: readonly(userRef),
    error: readonly(errorRef),
    checkAuth,
    login,
    logout,
  };
}
