/**
 * api/sign-google.js — Google Wallet pass signing
 *
 * TASK-0050 — Wallet Signing and Issuance Contract
 *
 * Called ONLY by the Supabase wallet-issue Edge Function.
 * Verified via Authorization: Bearer <WALLET_INTERNAL_SECRET>.
 * Direct client calls are rejected.
 *
 * Accepts: { credential_id }
 * Loads all pass data from Supabase using service role key.
 * Signs a Google Wallet JWT with RS256 using the Google service account.
 * Returns: { success, save_url, object_id }
 *
 * Note: wallet pass does NOT embed a permanent QR code.
 * Verifier access is via share-link tokens (separate feature).
 *
 * Required Vercel env vars:
 *   WALLET_INTERNAL_SECRET       — shared token with wallet-issue Edge Function
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — service account JSON (stringified)
 *   GOOGLE_WALLET_ISSUER_ID      — Google Wallet issuer ID
 *   GOOGLE_WALLET_CLASS_ID       — Google Wallet class ID
 *   PASSTO_LOGO_URL              — publicly accessible PassTo logo URL
 *   SUPABASE_URL                 — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY    — Supabase service role key
 */

const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // ── Internal authentication ────────────────────────────────────────────────
  const internalSecret = process.env.WALLET_INTERNAL_SECRET ?? "";
  const authHeader     = req.headers["authorization"] ?? "";
  if (!internalSecret || authHeader !== `Bearer ${internalSecret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { credential_id } = req.body ?? {};
  if (!credential_id) return res.status(400).json({ error: "credential_id required" });

  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ success: false, error: "supabase_not_configured" });
  }

  const admin = createClient(supabaseUrl, supabaseKey);

  // ── Load credential data from Supabase ─────────────────────────────────────
  const { data: credential, error: credErr } = await admin
    .from("credentials")
    .select("id, status, pass_template_data")
    .eq("id", credential_id)
    .maybeSingle();

  if (credErr || !credential) {
    return res.status(404).json({ success: false, error: "credential_not_found" });
  }
  if (!["pending", "active"].includes(credential.status)) {
    return res.status(400).json({ success: false, error: "credential_not_issuable", status: credential.status });
  }

  const d = credential.pass_template_data ?? {};
  const nurseName      = d.nurse_name       ?? "Verified Nurse";
  const licenseType    = d.license_type     ?? "";
  const licenseState   = d.license_state    ?? "";
  const licenseNumber  = d.license_number   ?? "";
  const status         = d.normalized_status ?? "Active";
  const expirationDate = d.expiration_date  ?? "";

  // ── Required Google env vars ───────────────────────────────────────────────
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "";
  const issuerId           = process.env.GOOGLE_WALLET_ISSUER_ID     ?? "";
  const classId            = process.env.GOOGLE_WALLET_CLASS_ID      ?? "";
  const logoUrl            = process.env.PASSTO_LOGO_URL             ?? "";

  if (!serviceAccountJson || !issuerId || !classId) {
    console.error("sign-google: Google Wallet credentials not configured");
    return res.status(503).json({ success: false, error: "google_wallet_not_configured" });
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Deterministic object ID from credential_id for idempotency
    // Use only alphanumeric + underscore (Google Wallet requirement)
    const safeId   = credential_id.replace(/-/g, "_");
    const objectId = `passto_${safeId}`;

    const genericObject = {
      id:      `${issuerId}.${objectId}`,
      classId: `${issuerId}.${classId}`,
      state:   "ACTIVE",
      hexBackgroundColor: "#0B1220",  // Ink-900
      ...(logoUrl ? {
        logo: {
          sourceUri:           { uri: logoUrl },
          contentDescription:  { defaultValue: { language: "en-US", value: "PassTo Logo" } },
        },
      } : {}),
      cardTitle: {
        defaultValue: { language: "en-US", value: "PassTo" },
      },
      subheader: {
        defaultValue: { language: "en-US", value: "Verified Nursing License" },
      },
      header: {
        defaultValue: { language: "en-US", value: nurseName },
      },
      textModulesData: [
        { id: "license_type",  header: "TYPE",         body: licenseType },
        { id: "license_state", header: "STATE",        body: licenseState },
        { id: "license_number",header: "LICENSE #",    body: licenseNumber },
        { id: "status",        header: "STATUS",       body: status },
        { id: "valid_through", header: "VALID THROUGH",body: expirationDate },
      ],
      // No barcode/QR — pass does not carry a permanent verification QR.
      // Verifier access is via share-link tokens (separate feature).
    };

    const claims = {
      iss:     serviceAccount.client_email,
      aud:     "google",
      origins: ["passtodigital.com", "enroll.passtodigital.com"],
      typ:     "savetowallet",
      payload: { genericObjects: [genericObject] },
    };

    const token = jwt.sign(claims, serviceAccount.private_key, { algorithm: "RS256" });

    return res.status(200).json({
      success:   true,
      save_url:  `https://pay.google.com/gp/v/save/${token}`,
      object_id: `${issuerId}.${objectId}`,
    });
  } catch (error) {
    console.error("sign-google error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
