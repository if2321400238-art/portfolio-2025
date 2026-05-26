import type { FastifyBaseLogger } from "fastify";

type AuditAction =
  | "login_success"
  | "login_failed"
  | "logout"
  | "session_revoked"
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "upload_created"
  | "upload_deleted";

type AuditEvent = {
  action: AuditAction;
  requestId: string;
  ip: string;
  username?: string | null;
  meta?: Record<string, unknown>;
  timestamp: string;
};

export function createAuditLogger(baseLogger: FastifyBaseLogger) {
  return {
    log(event: Omit<AuditEvent, "timestamp">) {
      baseLogger.info(
        {
          audit: {
            ...event,
            timestamp: new Date().toISOString(),
          },
        },
        "audit",
      );
    },
  };
}
