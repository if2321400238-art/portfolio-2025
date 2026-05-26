export type EnvConfig = {
  adminUsername: string;
  adminPasswordHash: string;
  adminSessionSecret: string;
  adminCookieName: string;
  corsOrigins: string[];
  isProduction: boolean;
  sessionTtlMs: number;
  sessionIdleMs: number;
  sessionRotateMs: number;
  cookieSecure: boolean;
  redisUrl?: string;
  redisPrefix: string;
  enableSessionFingerprint: boolean;
};

type EnvInput = Record<string, string | undefined>;

type EnvValidationResult = {
  config: EnvConfig;
  warnings: string[];
};

const DEFAULT_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

export function loadEnv(env: EnvInput): EnvValidationResult {
  const adminUsername = env.ADMIN_USERNAME ?? "";
  const adminPasswordHash = env.ADMIN_PASSWORD_HASH ?? "";
  const adminSessionSecret = env.ADMIN_SESSION_SECRET ?? "";
  const adminCookieName = env.ADMIN_COOKIE_NAME ?? "admin_session";
  const isProduction = env.NODE_ENV === "production";
  const cookieSecure = isProduction;

  const sessionTtlMs = parseMs(env.ADMIN_SESSION_TTL_MS, 12 * 60 * 60 * 1000);
  const sessionIdleMs = parseMs(env.ADMIN_SESSION_IDLE_MS, 30 * 60 * 1000);
  const sessionRotateMs = parseMs(env.ADMIN_SESSION_ROTATE_MS, 60 * 60 * 1000);

  const corsOrigins = parseOrigins(env.PORTFOLIO_CORS_ORIGINS);
  const redisUrl = env.REDIS_URL;
  const redisPrefix = env.REDIS_PREFIX ?? "portfolio:session";
  const enableSessionFingerprint = env.ADMIN_SESSION_FINGERPRINT === "true";

  const warnings: string[] = [];

  if (!adminUsername || !adminPasswordHash || !adminSessionSecret) {
    throw new Error("Set ADMIN_USERNAME, ADMIN_PASSWORD_HASH, and ADMIN_SESSION_SECRET before starting the backend.");
  }

  if (isProduction && adminUsername === "admin") {
    throw new Error("ADMIN_USERNAME cannot be 'admin' in production.");
  }

  if (adminSessionSecret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  }

  if (!adminPasswordHash.trim()) {
    throw new Error("ADMIN_PASSWORD_HASH cannot be empty.");
  }

  if (isProduction && !cookieSecure) {
    throw new Error("Secure cookies must be enabled in production.");
  }

  if (!corsOrigins.length) {
    warnings.push("PORTFOLIO_CORS_ORIGINS is empty; CORS will reject all cross-origin requests.");
  }

  return {
    config: {
      adminUsername,
      adminPasswordHash,
      adminSessionSecret,
      adminCookieName,
      corsOrigins,
      isProduction,
      sessionTtlMs,
      sessionIdleMs,
      sessionRotateMs,
      cookieSecure,
      redisUrl,
      redisPrefix,
      enableSessionFingerprint,
    },
    warnings,
  };
}

function parseOrigins(value?: string) {
  if (!value) return DEFAULT_ORIGINS;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMs(value: string | undefined, fallbackMs: number) {
  if (!value) return fallbackMs;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallbackMs;
  return parsed;
}
