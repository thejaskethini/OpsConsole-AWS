import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  signSession,
  verifySession,
  buildSetCookieHeader,
  buildClearCookieHeader,
  COOKIE_NAME,
} from "../src/lib/session.ts";

describe("Session HMAC and Cookie Tests", () => {
  it("generates a valid signed session token", () => {
    const token = signSession();
    assert.ok(token);
    assert.equal(typeof token, "string");
    const parts = token.split(".");
    assert.equal(parts.length, 2);
    assert.ok(!isNaN(parseInt(parts[0], 10)));
    assert.equal(parts[1].length, 64); // SHA-256 hex digest length
  });

  it("verifies a validly signed token successfully", () => {
    const token = signSession();
    const isValid = verifySession(token);
    assert.equal(isValid, true);
  });

  it("rejects undefined, null, or empty tokens", () => {
    assert.equal(verifySession(undefined), false);
    assert.equal(verifySession(""), false);
  });

  it("rejects tampered tokens", () => {
    const token = signSession();
    const [ts, sig] = token.split(".");
    // Tamper timestamp
    const tamperedTs = (parseInt(ts, 10) + 1).toString();
    assert.equal(verifySession(`${tamperedTs}.${sig}`), false);

    // Tamper signature
    const tamperedSig = sig.slice(0, -2) + "00";
    assert.equal(verifySession(`${ts}.${tamperedSig}`), false);

    // Malformed format
    assert.equal(verifySession("invalidtokenstring"), false);
  });

  it("builds Set-Cookie header with secure attributes", () => {
    const token = "mock-token.123";
    const header = buildSetCookieHeader(token);
    assert.ok(header.includes(`${COOKIE_NAME}=${token}`));
    assert.ok(header.includes("HttpOnly"));
    assert.ok(header.includes("SameSite=Strict"));
    assert.ok(header.includes("Path=/"));
  });

  it("builds Clear-Cookie header with zero max-age", () => {
    const header = buildClearCookieHeader();
    assert.ok(header.includes(`${COOKIE_NAME}=;`));
    assert.ok(header.includes("Max-Age=0"));
  });
});
