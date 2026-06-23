/**
 * Verifier-session cookie helpers.
 *
 * TASK-0074 / APPROVAL-0037 / Stage 1 / CR3-0074-02 + CR4-0074-01
 *
 * Cookie name: demo_vs
 * Value:       base64url(payload) || "." || base64url(hmac)
 * Payload:     verifier_session_id || ":" || expires_at_unix_seconds
 * HMAC key:    DEMO_VERIFIER_SESSION_HMAC_SECRET (Supabase secret on the
 *              demo project only)
 *
 * Set-Cookie attributes: HttpOnly, Secure, SameSite=Strict, narrow Path,
 * narrow Domain, Max-Age matched to verifier_session TTL.
 *
 * Same-origin dependency: the verifier endpoints MUST be reachable from
 * the browser at URLs on demo.passtodigital.com. Pattern A (Lovable
 * rewrite) or Pattern B (Supabase custom domain) — recorded in the
 * Environment Isolation Manifest.
 */

import { hmacSign, constantTimeEqual } from "./demo-auth.ts";
import { manifest } from "./demo-isolation.ts";

export interface VerifierSessionCookieClaims {
  verifierSessionId: string;
  expiresAtUnix: number;
}

const COOKIE_NAME = "demo_vs";

function getHmacSecret(): string {
  const s = Deno.env.get("DEMO_VERIFIER_SESSION_HMAC_SECRET") ?? "";
  if (s.length < 32) {
    throw new Error("DEMO_VERIFIER_SESSION_HMAC_SECRET missing or too short");
  }
  return s;
}

export async function buildVerifierSessionCookie(
  claims: VerifierSessionCookieClaims,
): Promise<string> {
  const payload = `${claims.verifierSessionId}:${claims.expiresAtUnix}`;
  const sig = await hmacSign(getHmacSecret(), payload);
  const value = `${base64url(payload)}.${sig}`;
  const maxAge = Math.max(
    1,
    claims.expiresAtUnix - Math.floor(Date.now() / 1000),
  );
  const attrs = [
    `${COOKIE_NAME}=${value}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Path=${manifest.allowed.verifier_session_cookie_path}`,
    `Domain=${manifest.allowed.verifier_session_cookie_domain}`,
    `Max-Age=${maxAge}`,
  ];
  return attrs.join("; ");
}

export function buildVerifierSessionCookieClear(): string {
  const attrs = [
    `${COOKIE_NAME}=`,
    `Path=${manifest.allowed.verifier_session_cookie_path}`,
    `Domain=${manifest.allowed.verifier_session_cookie_domain}`,
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
  ];
  return attrs.join("; ");
}

/**
 * Parse and verify the demo_vs cookie. Returns null on any failure
 * (missing, malformed, HMAC mismatch, expired).
 */
export async function verifyVerifierSessionCookie(
  req: Request,
): Promise<VerifierSessionCookieClaims | null> {
  const cookieHeader = req.headers.get("Cookie") ?? "";
  const cookies = cookieHeader.split(/;\s*/);
  const target = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!target) return null;

  const raw = target.substring(COOKIE_NAME.length + 1);
  const dotIdx = raw.lastIndexOf(".");
  if (dotIdx < 1) return null;
  const payloadB64 = raw.substring(0, dotIdx);
  const sigB64 = raw.substring(dotIdx + 1);

  let payload: string;
  try {
    payload = base64urlDecode(payloadB64);
  } catch {
    return null;
  }

  const expectedSig = await hmacSign(getHmacSecret(), payload);
  if (!constantTimeEqual(sigB64, expectedSig)) return null;

  const colonIdx = payload.lastIndexOf(":");
  if (colonIdx < 1) return null;
  const verifierSessionId = payload.substring(0, colonIdx);
  const expiresAtUnix = parseInt(payload.substring(colonIdx + 1), 10);
  if (!Number.isFinite(expiresAtUnix)) return null;
  if (expiresAtUnix <= Math.floor(Date.now() / 1000)) return null;

  return { verifierSessionId, expiresAtUnix };
}

function base64url(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(s: string): string {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b64)));
}
