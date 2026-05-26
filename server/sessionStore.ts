import { randomBytes } from "node:crypto";

export type Session = {
  id: string;
  username: string | null;
  csrfToken: string;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
  idleExpiresAt: number;
  lastRotatedAt: number;
  requiresTwoFactor: boolean;
  secondFactorVerified: boolean;
  userAgentHash?: string | null;
};

export type CreateSessionInput = {
  username: string | null;
  requiresTwoFactor: boolean;
  secondFactorVerified: boolean;
  userAgentHash?: string | null;
};

export type SessionStoreOptions = {
  ttlMs: number;
  idleTimeoutMs: number;
  rotateMs: number;
};

export type SessionStore = {
  createSession: (input: CreateSessionInput) => Promise<Session>;
  getSession: (id: string) => Promise<Session | null>;
  touchSession: (id: string) => Promise<Session | null>;
  rotateSession: (id: string, input: CreateSessionInput) => Promise<Session>;
  invalidateSession: (id: string) => Promise<void>;
  invalidateUserSessions: (username: string) => Promise<number>;
  cleanupExpired: () => Promise<void>;
  needsRotation: (session: Session) => boolean;
};

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, Session>();
  private ttlMs: number;
  private idleTimeoutMs: number;
  private rotateMs: number;

  constructor(options: SessionStoreOptions) {
    this.ttlMs = options.ttlMs;
    this.idleTimeoutMs = options.idleTimeoutMs;
    this.rotateMs = options.rotateMs;
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

    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(id: string) {
    const session = this.sessions.get(id);
    if (!session) return null;

    if (this.isExpired(session)) {
      this.sessions.delete(id);
      return null;
    }

    return session;
  }

  async touchSession(id: string) {
    const session = this.sessions.get(id);
    if (!session) return null;

    if (this.isExpired(session)) {
      this.sessions.delete(id);
      return null;
    }

    const now = Date.now();
    session.lastActiveAt = now;
    session.idleExpiresAt = now + this.idleTimeoutMs;
    return session;
  }

  async rotateSession(id: string, input: CreateSessionInput) {
    this.sessions.delete(id);
    return this.createSession(input);
  }

  async invalidateSession(id: string) {
    this.sessions.delete(id);
  }

  async invalidateUserSessions(username: string) {
    let count = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (session.username === username) {
        this.sessions.delete(id);
        count += 1;
      }
    }
    return count;
  }

  async cleanupExpired() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt <= now || session.idleExpiresAt <= now) {
        this.sessions.delete(id);
      }
    }
  }

  needsRotation(session: Session) {
    return Date.now() - session.lastRotatedAt >= this.rotateMs;
  }

  private isExpired(session: Session) {
    const now = Date.now();
    return session.expiresAt <= now || session.idleExpiresAt <= now;
  }
}

export function createId() {
  return randomBytes(32).toString("base64url");
}

export function createToken() {
  return randomBytes(32).toString("base64url");
}
