import type { FastifyReply, FastifyRequest } from "fastify";

const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/;

export function createAuthorizationHeaderMiddleware() {
  return async function validateAuthorizationHeader(request: FastifyRequest, reply: FastifyReply) {
    const raw = request.headers.authorization;
    if (!raw) return;

    if (Array.isArray(raw)) {
      return void reply.status(400).send({ error: "Invalid authorization header format" });
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      return void reply.status(400).send({ error: "Invalid authorization header format" });
    }

    if (CONTROL_CHAR_REGEX.test(trimmed)) {
      return void reply.status(400).send({ error: "Invalid authorization header format" });
    }

    const match = /^Bearer\s+(\S+)$/.exec(trimmed);
    if (!match) {
      return void reply.status(400).send({ error: "Invalid authorization header format" });
    }

    const token = match[1];
    if (!token || CONTROL_CHAR_REGEX.test(token) || /\s/.test(token)) {
      return void reply.status(400).send({ error: "Invalid authorization header format" });
    }
  };
}
