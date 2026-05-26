import type { EnvConfig } from "./env";

export function getSessionCookieOptions(env: EnvConfig) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: env.cookieSecure,
    path: "/",
    maxAge: Math.floor(env.sessionTtlMs / 1000),
  };
}
