import { createHash } from "node:crypto";
import type { RedisClientType } from "redis";
import {
  type CreateSessionInput,
  type Session,
  type SessionStore,
  type SessionStoreOptions,
  createId,
  createToken,
} from "./sessionStore";

const DEFAULT_PREFIX = "portfolio:session";

export class RedisSessionStore implements SessionStore {
  private client: RedisClientType;
  private ttlMs: number;
  private idleTimeoutMs: number;
  private rotateMs: number;
  private prefix: string;

  constructor(client: RedisClientType, options: SessionStoreOptions, prefix = DEFAULT_PREFIX) {
    this.client = client;
    this.ttlMs = options.ttlMs;
    this.idleTimeoutMs = options.idleTimeoutMs;
    this.rotateMs = options.rotateMs;
    this.prefix = prefix;
  }

  async createSession(input: CreateSessionInput) {
    const now = Date.now();
    const session: Session = {
      id: createId(),
      username: input.username,
      csrfToken: createToken(),
      createdAt: now,
      lastActiveAt: now,
      expiresAt: now + this.ttlMs,
      idleExpiresAt: now + this.idleTimeoutMs,
      lastRotatedAt: now,
      requiresTwoFactor: input.requiresTwoFactor,
      secondFactorVerified: input.secondFactorVerified,
      userAgentHash: input.userAgentHash ?? null,
    };

    await this.writeSession(session);
    return session;
  }

  async getSession(id: string) {
    const payload = await this.client.get(this.sessionKey(id));
    if (!payload) return null;

    const session = JSON.parse(payload) as Session;
    if (this.isExpired(session)) {
      await this.invalidateSession(id);
      return null;
    }

    return session;
  }

  async touchSession(id: string) {
    const session = await this.getSession(id);
    if (!session) return null;

    const now = Date.now();
    session.lastActiveAt = now;
    session.idleExpiresAt = now + this.idleTimeoutMs;

    await this.writeSession(session);
    return session;
  }

  async rotateSession(id: string, input: CreateSessionInput) {
    await this.invalidateSession(id);
    return this.createSession(input);
  }

  async invalidateSession(id: string) {
    const session = await this.getSession(id);
    if (session?.username) {
      await this.client.sRem(this.userKey(session.username), id);
    }
    await this.client.del(this.sessionKey(id));
  }

  async invalidateUserSessions(username: string) {
    const ids = await this.client.sMembers(this.userKey(username));
    if (!ids.length) return 0;

    const pipeline = this.client.multi();
    ids.forEach((id) => pipeline.del(this.sessionKey(id)));
    pipeline.del(this.userKey(username));
    await pipeline.exec();
    return ids.length;
  }

  async cleanupExpired() {
    // Redis TTL handles expiry; nothing needed.
  }

  needsRotation(session: Session) {
    return Date.now() - session.lastRotatedAt >= this.rotateMs;
  }

  private async writeSession(session: Session) {
    const ttlSeconds = Math.max(1, Math.floor((session.expiresAt - Date.now()) / 1000));
    const payload = JSON.stringify(session);
    await this.client.set(this.sessionKey(session.id), payload, { EX: ttlSeconds });

    if (session.username) {
      await this.client.sAdd(this.userKey(session.username), session.id);
    }
  }

  private sessionKey(id: string) {
    return `${this.prefix}:${id}`;
  }

  private userKey(username: string) {
    const safeUser = createHash("sha256").update(username).digest("hex");
    return `${this.prefix}:user:${safeUser}`;
  }

  private isExpired(session: Session) {
    const now = Date.now();
    return session.expiresAt <= now || session.idleExpiresAt <= now;
  }
}
