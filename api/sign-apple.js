/**
 * api/sign-apple.js — Apple Wallet pass signing
 *
 * TASK-0050 — Wallet Signing and Issuance Contract
 *
 * Called ONLY by the Supabase wallet-issue Edge Function.
 * Verified via Authorization: Bearer <WALLET_INTERNAL_SECRET>.
 * Direct client calls are rejected.
 *
 * Accepts: { credential_id }
 * Loads all pass data from Supabase using service role key.
 * Signs .pkpass using passkit-generator.
 * Uploads to Vercel Blob (public, stable URL).
 * Returns: { success, pass_url, serial_number }
 *
 * Required Vercel env vars:
 *   WALLET_INTERNAL_SECRET  — shared token with wallet-issue Edge Function
 *   APPLE_WWDR_PEM_BASE64   — Apple WWDR cert (base64 PEM)
 *   APPLE_CERT_PEM_BASE64   — Apple signing cert (base64 PEM)
 *   APPLE_KEY_PEM_BASE64    — Apple signing key (base64 PEM)
 *   APPLE_CERT_PASSWORD     — key passphrase (may be empty string)
 *   APPLE_PASS_TYPE_ID      — pass.com.passto.nursecredential (or similar)
 *   APPLE_TEAM_ID           — Apple Developer Team ID
 *   SUPABASE_URL            — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
 */

const { PKPass } = require("passkit-generator");
const { put }    = require("@vercel/blob");
const path       = require("path");
const fs         = require("fs");
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

  // ── Load credential + license data from Supabase ───────────────────────────
  const { data: credential, error: credErr } = await admin
    .from("credentials")
    .select("id, status, pass_template_data, profile_id, license_id")
    .eq("id", credential_id)
    .maybeSingle();

  if (credErr || !credential) {
    return res.status(404).json({ success: false, error: "credential_not_found" });
  }
  if (!["pending", "active"].includes(credential.status)) {
    return res.status(400).json({ success: false, error: "credential_not_issuable", status: credential.status });
  }

  const d = credential.pass_template_data ?? {};
  const nurseName      = d.nurse_name      ?? "Verified Nurse";
  const licenseType    = d.license_type    ?? "";
  const licenseState   = d.license_state   ?? "";
  const licenseNumber  = d.license_number  ?? "";
  const status         = d.normalized_status ?? "Active";
  const expirationDate = d.expiration_date ?? "";
  const issuedDate     = d.credential_created ? d.credential_created.slice(0, 10) : "";

  // ── Required Apple env vars ────────────────────────────────────────────────
  const wwdrB64   = process.env.APPLE_WWDR_PEM_BASE64   ?? "";
  const certB64   = process.env.APPLE_CERT_PEM_BASE64   ?? "";
  const keyB64    = process.env.APPLE_KEY_PEM_BASE64    ?? "";
  const certPass  = process.env.APPLE_CERT_PASSWORD     ?? "";
  const passTypeId = process.env.APPLE_PASS_TYPE_ID     ?? "";
  const teamId    = process.env.APPLE_TEAM_ID           ?? "";

  if (!wwdrB64 || !certB64 || !keyB64 || !passTypeId || !teamId) {
    console.error("sign-apple: Apple certificates not configured");
    return res.status(503).json({ success: false, error: "apple_certificates_not_configured" });
  }

  try {
    // Deterministic serial number from credential_id for idempotency
    const serialNumber = `passto-${credential_id}`;

    const wwdr      = Buffer.from(wwdrB64, "base64");
    const signerCert = Buffer.from(certB64, "base64");
    const signerKey  = Buffer.from(keyB64,  "base64");

    const assetsDir = path.join(__dirname, "assets");
    const icon      = fs.readFileSync(path.join(assetsDir, "icon.png"));
    const icon2x    = fs.readFileSync(path.join(assetsDir, "icon@2x.png"));
    const logo      = fs.readFileSync(path.join(assetsDir, "logo.png"));
    const logo2x    = fs.readFileSync(path.join(assetsDir, "logo@2x.png"));

    const passJson = {
      formatVersion:        1,
      passTypeIdentifier:   passTypeId,
      teamIdentifier:       teamId,
      serialNumber,
      description:          "PassTo Verified Nursing License",
      organizationName:     "PassTo",
      logoText:             "PassTo",
      foregroundColor:      "rgb(255, 255, 255)",
      backgroundColor:      "rgb(11, 18, 32)",    // Ink-900 #0B1220
      labelColor:           "rgb(47, 176, 105)",  // Verified-400 #2FB069
      generic: {
        primaryFields: [
          { key: "name",    label: "NURSE",    value: nurseName },
        ],
        secondaryFields: [
          { key: "license", label: "LICENSE #", value: licenseNumber },
          { key: "type",    label: "TYPE",      value: licenseType },
        ],
        auxiliaryFields: [
          { key: "status",  label: "STATUS",       value: status },
          { key: "expires", label: "VALID THROUGH", value: expirationDate },
        ],
        backFields: [
          { key: "state",   label: "STATE",              value: licenseState },
          { key: "issued",  label: "CREDENTIAL ISSUED",  value: issuedDate },
          { key: "issuer",  label: "CREDENTIAL ISSUED BY", value: "PassTo — passtodigital.com" },
        ],
      },
    };

    const pass = new PKPass(
      {
        "pass.json":   Buffer.from(JSON.stringify(passJson)),
        "icon.png":    icon,
        "icon@2x.png": icon2x,
        "logo.png":    logo,
        "logo@2x.png": logo2x,
      },
      {
        wwdr,
        signerCert,
        signerKey,
        signerKeyPassphrase: certPass,
      }
    );

    const pkpassBuffer = await pass.getAsBuffer();

    const blob = await put(
      `passes/${credential_id}/${serialNumber}.pkpass`,
      pkpassBuffer,
      { access: "public", contentType: "application/vnd.apple.pkpass" }
    );

    return res.status(200).json({
      success:       true,
      pass_url:      blob.url,
      serial_number: serialNumber,
    });
  } catch (error) {
    console.error("sign-apple error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
