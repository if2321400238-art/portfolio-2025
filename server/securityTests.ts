import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { createAuthorizationHeaderMiddleware } from "./authorizationHeader";

function mockRequest(headers: Record<string, string | undefined>) {
  return {
    headers,
  } as any;
}

function mockReply() {
  return {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: any) {
      this.payload = payload;
      return this;
    },
    payload: null as any,
  } as any;
}

async function testAuthorizationHeader() {
  const middleware = createAuthorizationHeaderMiddleware();

  const badHeaders = [
    "Bearer",
    "Bearer   ",
    "Bearer\t",
    "Bearer \nabc",
    "Token abc",
    "Bearer abc def",
    "\u0000Bearer abc",
  ];

  for (const header of badHeaders) {
    const reply = mockReply();
    await middleware(mockRequest({ authorization: header }), reply);
    assert.equal(reply.statusCode, 400, `Expected 400 for ${header}`);
  }

  const good = "Bearer " + randomBytes(8).toString("hex");
  const reply = mockReply();
  await middleware(mockRequest({ authorization: good }), reply);
  assert.equal(reply.statusCode, 200);
}

await testAuthorizationHeader();
