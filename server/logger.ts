import type { FastifyBaseLogger } from "fastify";

type Logger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export function createLogger(baseLogger: FastifyBaseLogger): Logger {
  return {
    info: (message, meta) => baseLogger.info(meta ?? {}, message),
    warn: (message, meta) => baseLogger.warn(meta ?? {}, message),
    error: (message, meta) => baseLogger.error(meta ?? {}, message),
  };
}

export function logRequestSummary(
  baseLogger: FastifyBaseLogger,
  request: { id: string; ip: string; method: string; url: string },
  reply: { statusCode: number },
) {
  baseLogger.info(
    {
      requestId: request.id,
      ip: request.ip,
      method: request.method,
      endpoint: request.url,
      statusCode: reply.statusCode,
    },
    "request",
  );
}
