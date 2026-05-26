import type { FastifyReply, FastifyRequest } from "fastify";
import type { EnvConfig } from "./env";
import type { SessionStore } from "./sessionStore";

export type AuthContext = {
  sessionId: string;
  session: {
    username: string | null;
    requiresTwoFactor: boolean;
    secondFactorVerified: boolean;
    userAgentHash?: string | null;
  };
};

type AuthMiddlewareOptions = {
  sessionStore: SessionStore;
  env: EnvConfig;
};

export function createAuthMiddleware({ sessionStore, env }: AuthMiddlewareOptions) {
  return async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
    const sessionId = request.cookies?.[env.adminCookieName];
    if (!sessionId || typeof sessionId !== "string") {
      return void reply.status(401).send({ error: "Unauthorized" });
    }

    const session = await sessionStore.touchSession(sessionId);
    if (!session || !session.username || session.username !== env.adminUsername) {
      if (sessionId) {
        await sessionStore.invalidateSession(sessionId);
      }
      return void reply.status(401).send({ error: "Unauthorized" });
    }

    (request as FastifyRequest & { auth: AuthContext }).auth = {
      sessionId,
      session: {
        username: session.username,
        requiresTwoFactor: session.requiresTwoFactor,
        secondFactorVerified: session.secondFactorVerified,
        userAgentHash: session.userAgentHash ?? null,
      },
    };
  };
}
