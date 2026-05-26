import "dotenv/config";

import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import staticPlugin from "@fastify/static";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { fileTypeFromBuffer } from "file-type";

import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  patchProject,
  saveUpload,
  updateProject,
  assetRootPath,
  listUploads,
  deleteUpload,
} from "./store";
import { projectBodySchema } from "./schemas";
import { loadEnv } from "./env";
import { MemorySessionStore } from "./sessionStore";
import { RedisSessionStore } from "./redisSessionStore";
import { createClient } from "redis";
import { createHash } from "node:crypto";
import { createAuditLogger } from "./auditLogger";
import { SecurityState } from "./securityState";
import { createAuthMiddleware } from "./authMiddleware";
import { createCsrfMiddleware } from "./csrfMiddleware";
import { getSessionCookieOptions } from "./cookies";
import { createLogger, logRequestSummary } from "./logger";
import { createAuthorizationHeaderMiddleware } from "./authorizationHeader";

const { config: envConfig, warnings } = loadEnv(process.env);

const scryptAsync = promisify(scrypt);

const app = Fastify({
  logger: {
    redact: ["req.headers.authorization", "req.headers.cookie"],
  },
  bodyLimit: 256 * 1024,
  trustProxy: true,
});

const logger = createLogger(app.log);
warnings.forEach((warning) => logger.warn(warning));

const sessionStore = await buildSessionStore();

const securityState = new SecurityState();
const auditLogger = createAuditLogger(app.log);

async function buildSessionStore() {
  const options = {
    ttlMs: envConfig.sessionTtlMs,
    idleTimeoutMs: envConfig.sessionIdleMs,
    rotateMs: envConfig.sessionRotateMs,
  };

  if (!envConfig.redisUrl) {
    logger.warn("REDIS_URL not set; using in-memory session store.");
    return new MemorySessionStore(options);
  }

  try {
    const client = createClient({ url: envConfig.redisUrl });
    client.on("error", (err) => {
      logger.warn("Redis connection error", { message: err.message });
    });

    await client.connect();
    return new RedisSessionStore(client, options, envConfig.redisPrefix);
  } catch (error) {
    logger.warn("Failed to connect Redis; falling back to in-memory store.");
    return new MemorySessionStore(options);
  }
}

// Security: HttpOnly session cookie with SameSite=Strict.
const adminCookieOptions = getSessionCookieOptions(envConfig);

mkdirSync(resolve(process.cwd(), "data/uploads"), { recursive: true });

await app.register(helmet, {
  global: true,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: envConfig.isProduction ? [] : null,
    },
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  frameguard: { action: "deny" },
  noSniff: true,
});

app.addHook("onSend", (request, reply, payload, done) => {
  reply.header("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), fullscreen=(self)");
  done();
});

await app.register(cookie);

// Security: only allow credentialed requests from explicit, trusted origins.
await app.register(cors, {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (envConfig.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin not allowed"), false);
  },
  credentials: true,
});

await app.register(rateLimit, {
  max: 120,
  timeWindow: "1 minute",
});

const writeRateLimit = {
  config: {
    rateLimit: {
      max: 30,
      timeWindow: "1 minute",
    },
  },
};

await app.register(multipart, {
  attachFieldsToBody: false,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
  },
});

await app.register(staticPlugin, {
  root: assetRootPath(),
  prefix: "/assets/",
  decorateReply: false,
  maxAge: "30d",
  immutable: true,
});

await app.register(staticPlugin, {
  root: resolve(process.cwd(), "data/uploads"),
  prefix: "/uploads/",
  decorateReply: false,
  maxAge: "1d",
  immutable: false,
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  if ((error as Error & { code?: string }).code === "FST_ERR_CTP_BODY_TOO_LARGE") {
    return void reply.status(413).send({ error: "Payload too large" });
  }

  if (error instanceof Error && error.name === "ZodError") {
    return void reply.status(400).send({ error: "Invalid request body" });
  }

  return void reply.status(500).send({ error: "Internal Server Error" });
});

app.addHook("onRequest", createAuthorizationHeaderMiddleware());

app.addHook("onResponse", (request, reply, done) => {
  logRequestSummary(app.log, request, reply);
  done();
});

app.get("/health", async () => {
  const projects = await listProjects();
  return { ok: true, projectCount: projects.length };
});

// Public: list all items
app.get("/api/items", async () => {
  return await listProjects();
});

// Public: get single item by slug
app.get("/api/items/:slug", async (request, reply) => {
  const { slug } = request.params as { slug: string };
  const project = await getProject(slug);
  if (!project) {
    return void reply.status(404).send({ error: "Item not found" });
  }
  return project;
});

const requireAdmin = createAuthMiddleware({ sessionStore, env: envConfig });
const requireCsrf = createCsrfMiddleware({ sessionStore, env: envConfig });

// Admin: create item
app.post(
  "/api/items",
  { preHandler: [requireAdmin, requireCsrf], ...writeRateLimit },
  async (request, reply) => {
    const parsed = projectBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return void reply.status(400).send({ error: parsed.error.flatten() });
    }

    try {
      const project = await createProject(parsed.data);
      auditLogger.log({
        action: "item_created",
        requestId: request.id,
        ip: request.ip,
        username: (request as any).auth?.session?.username ?? null,
        meta: { slug: project.slug, title: project.title },
      });
      return void reply.status(201).send(project);
    } catch (error) {
      throw error;
    }
  },
);

// Admin: update item
app.put(
  "/api/items/:slug",
  { preHandler: [requireAdmin, requireCsrf], ...writeRateLimit },
  async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const parsed = projectBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return void reply.status(400).send({ error: parsed.error.flatten() });
    }

    try {
      const project = await updateProject(slug, parsed.data);
      if (!project) {
        return void reply.status(404).send({ error: "Item not found" });
      }
      auditLogger.log({
        action: "item_updated",
        requestId: request.id,
        ip: request.ip,
        username: (request as any).auth?.session?.username ?? null,
        meta: { slug },
      });
      return project;
    } catch (error) {
      throw error;
    }
  },
);

// Admin: patch item
app.patch(
  "/api/items/:slug",
  { preHandler: [requireAdmin, requireCsrf], ...writeRateLimit },
  async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const parsed = projectBodySchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return void reply.status(400).send({ error: parsed.error.flatten() });
    }

    try {
      const project = await patchProject(slug, parsed.data);
      if (!project) {
        return void reply.status(404).send({ error: "Item not found" });
      }
      auditLogger.log({
        action: "item_updated",
        requestId: request.id,
        ip: request.ip,
        username: (request as any).auth?.session?.username ?? null,
        meta: { slug },
      });
      return project;
    } catch (error) {
      throw error;
    }
  },
);

// Admin: delete item
app.delete(
  "/api/items/:slug",
  { preHandler: [requireAdmin, requireCsrf], ...writeRateLimit },
  async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const deleted = await deleteProject(slug);
    if (!deleted) {
      return void reply.status(404).send({ error: "Item not found" });
    }
    auditLogger.log({
      action: "item_deleted",
      requestId: request.id,
      ip: request.ip,
      username: (request as any).auth?.session?.username ?? null,
      meta: { slug },
    });
    return void reply.status(204).send();
  },
);

// Admin: upload file
app.post(
  "/api/uploads",
  { preHandler: [requireAdmin, requireCsrf], ...writeRateLimit },
  async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return void reply.status(400).send({ error: "No file uploaded" });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }

    const buffer = Buffer.concat(chunks);
    const detectedMime = await detectMimeType(buffer);

    if (!detectedMime || !isAllowedMimeType(detectedMime)) {
      return void reply.status(400).send({ error: "Unsupported file type. Only images (jpg, png, webp) allowed." });
    }

    const extension = extensionForMime(detectedMime);
    const filename = `${randomUUID()}${extension}`;
    const targetPath = resolve(process.cwd(), "data/uploads", filename);
    mkdirSync(resolve(process.cwd(), "data/uploads"), { recursive: true });

    const { writeFile } = await import("node:fs/promises");
    await writeFile(targetPath, buffer);

    const url = await saveUpload(filename);
    auditLogger.log({
      action: "upload_created",
      requestId: request.id,
      ip: request.ip,
      username: (request as any).auth?.session?.username ?? null,
      meta: { filename },
    });
    return void reply.status(201).send({ url });
  },
);

// Admin: list uploads
app.get(
  "/api/uploads",
  { preHandler: requireAdmin, ...writeRateLimit },
  async () => {
    return await listUploads();
  },
);

// Admin: delete upload
app.delete(
  "/api/uploads/:filename",
  { preHandler: [requireAdmin, requireCsrf], ...writeRateLimit },
  async (request, reply) => {
    const { filename } = request.params as { filename: string };
    try {
      await deleteUpload(filename);
      auditLogger.log({
        action: "upload_deleted",
        requestId: request.id,
        ip: request.ip,
        username: (request as any).auth?.session?.username ?? null,
        meta: { filename },
      });
      return void reply.status(204).send();
    } catch (err) {
      if (err instanceof Error && err.message === "NOT_FOUND") {
        return void reply.status(404).send({ error: "File not found" });
      }
      if (err instanceof Error && err.message === "INVALID_FILENAME") {
        return void reply.status(400).send({ error: "Invalid filename" });
      }
      throw err;
    }
  },
);

// Auth routes
app.get(
  "/api/auth/me",
  async (request, reply) => {
    const sessionId = request.cookies?.[envConfig.adminCookieName];
    if (!sessionId || typeof sessionId !== "string") {
      return void reply.status(401).send({ error: "Unauthorized" });
    }

    const session = await sessionStore.touchSession(sessionId);
    if (!session || !session.username) {
      if (sessionId) {
        await sessionStore.invalidateSession(sessionId);
      }
      return void reply.status(401).send({ error: "Unauthorized" });
    }

    if (envConfig.enableSessionFingerprint) {
      const userAgentHash = hashUserAgent(request.headers["user-agent"]);
      if (session.userAgentHash && session.userAgentHash !== userAgentHash) {
        await sessionStore.invalidateSession(sessionId);
        auditLogger.log({
          action: "session_revoked",
          requestId: request.id,
          ip: request.ip,
          username: session.username,
          meta: { reason: "fingerprint_mismatch" },
        });
        return void reply.status(401).send({ error: "Unauthorized" });
      }
    }

    if (sessionStore.needsRotation(session)) {
      const rotated = await sessionStore.rotateSession(sessionId, {
        username: session.username,
        requiresTwoFactor: session.requiresTwoFactor,
        secondFactorVerified: session.secondFactorVerified,
        userAgentHash: session.userAgentHash ?? null,
      });
      reply.setCookie(envConfig.adminCookieName, rotated.id, adminCookieOptions);
    }

    return { username: session.username };
  },
);

app.get(
  "/api/auth/session",
  async (request, reply) => {
    const sessionId = request.cookies?.[envConfig.adminCookieName];
    if (!sessionId || typeof sessionId !== "string") {
      return void reply.status(401).send({ error: "Unauthorized" });
    }

    const session = await sessionStore.getSession(sessionId);
    if (!session || !session.username) {
      if (sessionId) {
        await sessionStore.invalidateSession(sessionId);
      }
      return void reply.status(401).send({ error: "Unauthorized" });
    }

    return { username: session.username, csrfToken: session.csrfToken };
  },
);

app.post(
  "/api/auth/login",
  { ...writeRateLimit },
  async (request, reply) => {
    const { username, password } = typeof request.body === "object" && request.body
      ? (request.body as Record<string, unknown>)
      : { username: "", password: "" };

    const usernameValue = typeof username === "string" ? username.trim() : "";
    const passwordValue = typeof password === "string" ? password : "";

    if (!usernameValue || !passwordValue) {
      securityState.registerFailure(request.ip);
      auditLogger.log({
        action: "login_failed",
        requestId: request.id,
        ip: request.ip,
        username: usernameValue,
      });
      return void reply.status(401).send({ error: "Invalid credentials" });
    }

    if (securityState.isLocked(request.ip)) {
      return void reply.status(429).send({ error: "Terlalu banyak percobaan. Coba lagi nanti." });
    }

    const cooldownUntil = securityState.getCooldownUntil(request.ip);
    if (cooldownUntil) {
      return void reply.status(429).send({ error: "Tunggu sebentar sebelum mencoba lagi." });
    }

    if (usernameValue !== envConfig.adminUsername) {
      securityState.registerFailure(request.ip);
      auditLogger.log({
        action: "login_failed",
        requestId: request.id,
        ip: request.ip,
        username: usernameValue,
      });
      return void reply.status(401).send({ error: "Invalid credentials" });
    }

    const valid = await verifyPassword(passwordValue, envConfig.adminPasswordHash);
    if (!valid) {
      securityState.registerFailure(request.ip);
      auditLogger.log({
        action: "login_failed",
        requestId: request.id,
        ip: request.ip,
        username: usernameValue,
      });
      return void reply.status(401).send({ error: "Invalid credentials" });
    }

    securityState.reset(request.ip);

    const existingSessionId = request.cookies?.[envConfig.adminCookieName];
    if (existingSessionId && typeof existingSessionId === "string") {
      await sessionStore.invalidateSession(existingSessionId);
    }

    const requiresTwoFactor = false;
    const session = await sessionStore.createSession({
      username: usernameValue,
      requiresTwoFactor,
      secondFactorVerified: !requiresTwoFactor,
      userAgentHash: envConfig.enableSessionFingerprint ? hashUserAgent(request.headers["user-agent"]) : null,
    });
    reply.setCookie(envConfig.adminCookieName, session.id, adminCookieOptions);

    auditLogger.log({
      action: "login_success",
      requestId: request.id,
      ip: request.ip,
      username: usernameValue,
    });

    return { username: usernameValue, requiresTwoFactor: session.requiresTwoFactor };
  },
);

app.post(
  "/api/auth/logout",
  { preHandler: [requireAdmin, requireCsrf] },
  async (request, reply) => {
    const sessionId = request.cookies?.[envConfig.adminCookieName];
    if (sessionId && typeof sessionId === "string") {
      await sessionStore.invalidateSession(sessionId);
    }

    reply.clearCookie(envConfig.adminCookieName, { path: "/" });
    auditLogger.log({
      action: "logout",
      requestId: request.id,
      ip: request.ip,
      username: (request as any).auth?.session?.username ?? null,
    });
    return { ok: true };
  },
);

const port = Number.parseInt(process.env.PORT ?? "4000", 10);
const host = process.env.HOST ?? "0.0.0.0";

const cleanupInterval = setInterval(() => {
  sessionStore.cleanupExpired();
}, 5 * 60 * 1000);

cleanupInterval.unref();

await app.listen({ port, host });

async function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(derived, expected);
}

function isAllowedMimeType(mimeType: string) {
  return mimeType.startsWith("image/");
}

function extensionForMime(mimeType: string) {
  const mapping: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
  };
  return mapping[mimeType] ?? ".bin";
}

async function detectMimeType(buffer: Buffer) {
  const detected = await fileTypeFromBuffer(buffer);
  if (detected?.mime) return detected.mime;

  const text = buffer.toString("utf8", 0, Math.min(buffer.length, 256)).trimStart();
  if (text.startsWith("<svg") || text.startsWith("<?xml")) {
    if (text.includes("<svg")) {
      return "image/svg+xml";
    }
  }

  return null;
}

function hashUserAgent(userAgent: string | string[] | undefined) {
  if (!userAgent) return null;
  const ua = Array.isArray(userAgent) ? userAgent.join(" ") : userAgent;
  return createHash("sha256").update(ua).digest("hex");
}
