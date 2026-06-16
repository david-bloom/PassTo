/**
 * api/sign-apple-demo.js — Apple Wallet pass signing (DEMO environment)
 *
 * TASK-0074 Phase 8 — Demo Wallet Pass
 *
 * Demo variant of api/sign-apple.js.
 * Uses APPLE_DEMO_PASS_TYPE_ID and APPLE_DEMO_TEAM_ID instead of production certs.
 * Serial number: demo-{credential_id} (never overlaps with production passto-{credential_id}).
 * Pass has permanent DEMO labels baked into the template.
 *
 * Called ONLY by the demo Supabase wallet-issue Edge Function.
 * Verified via Authorization: Bearer <WALLET_INTERNAL_SECRET>.
 * Direct client calls are rejected.
 *
 * Required Vercel env vars (demo project):
 *   WALLET_INTERNAL_SECRET          — shared token with demo wallet-issue Edge Function
 *   APPLE_WWDR_PEM_BASE64           — Apple WWDR cert (base64 PEM, same across environments)
 *   APPLE_DEMO_CERT_PEM_BASE64      — Apple demo signing cert (base64 PEM)
 *   APPLE_DEMO_KEY_PEM_BASE64       — Apple demo signing key (base64 PEM)
 *   APPLE_DEMO_CERT_PASSWORD        — demo key passphrase (may be empty string)
 *   APPLE_DEMO_PASS_TYPE_ID         — demo pass type identifier (SEPARATE from production)
 *   APPLE_DEMO_TEAM_ID              — Apple Developer Team ID (may share with production)
 *   SUPABASE_URL                    — demo Supabase project URL (NOT production)
 *   SUPABASE_SERVICE_ROLE_KEY       — demo Supabase service role key
 *
 * Production guard: rejects requests if SUPABASE_URL contains the production
 * project ref 'wvzjfxacykgsaffskgtr'. This route must never run against
 * the production Supabase project.
 */

const { PKPass } = require("passkit-generator");
const { put }    = require("@vercel/blob");
const path       = require("path");
const fs         = require("fs");
const { createClient } = require("@supabase/supabase-js");

const PRODUCTION_PROJECT_REF = "wvzjfxacykgsaffskgtr";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // ── Production guard ───────────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  if (supabaseUrl.includes(PRODUCTION_PROJECT_REF)) {
    console.error("sign-apple-demo: production guard tripped — refusing to run against production project");
    return res.status(503).json({ error: "demo.environment_guard_tripped" });
  }

  // ── Internal authentication ────────────────────────────────────────────────
  const internalSecret = process.env.WALLET_INTERNAL_SECRET ?? "";
  const authHeader     = req.headers["authorization"] ?? "";
  if (!internalSecret || authHeader !== `Bearer ${internalSecret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { credential_id } = req.body ?? {};
  if (!credential_id) return res.status(400).json({ error: "credential_id required" });

  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ success: false, error: "supabase_not_configured" });
  }

  const admin = createClient(supabaseUrl, supabaseKey);

  // ── Load credential data from demo Supabase ────────────────────────────────
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

  const d               = credential.pass_template_data ?? {};
  const licenseType     = d.license_type    ?? "RN";
  const licenseState    = d.license_state   ?? "NY";
  const licenseNumber   = d.license_number  ?? "";
  const expirationDate  = d.expiration_date ?? "";
  const issuedDate      = d.credential_created ? d.credential_created.slice(0, 10) : "";

  // ── Required Apple demo env vars ───────────────────────────────────────────
  const wwdrB64    = process.env.APPLE_WWDR_PEM_BASE64         ?? "";
  const certB64    = process.env.APPLE_DEMO_CERT_PEM_BASE64    ?? "";
  const keyB64     = process.env.APPLE_DEMO_KEY_PEM_BASE64     ?? "";
  const certPass   = process.env.APPLE_DEMO_CERT_PASSWORD      ?? "";
  const passTypeId = process.env.APPLE_DEMO_PASS_TYPE_ID       ?? "";
  const teamId     = process.env.APPLE_DEMO_TEAM_ID            ?? "";

  if (!wwdrB64 || !certB64 || !keyB64 || !passTypeId || !teamId) {
    console.error("sign-apple-demo: demo Apple certificates not configured");
    return res.status(503).json({ success: false, error: "apple_demo_certificates_not_configured" });
  }

  try {
    // Unique serial per credential_id — demo prefix never overlaps with production
    const serialNumber = `demo-${credential_id}`;

    const wwdr       = Buffer.from(wwdrB64, "base64");
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
      description:          "PassTo DEMO — Not a Valid Credential",
      organizationName:     "PassTo",
      logoText:             "PassTo DEMO",
      foregroundColor:      "rgb(255, 255, 255)",
      backgroundColor:      "rgb(11, 18, 32)",    // Ink-900 #0B1220
      labelColor:           "rgb(47, 176, 105)",  // Verified-400 #2FB069
      generic: {
        primaryFields: [
          // Permanent DEMO label instead of nurse name
          { key: "name", label: "DEMO", value: "Avery Demo" },
        ],
        secondaryFields: [
          { key: "license", label: "LICENSE #", value: licenseNumber },
          { key: "type",    label: "TYPE",      value: licenseType },
        ],
        auxiliaryFields: [
          { key: "status",  label: "STATUS",       value: "Active - Simulated" },
          { key: "expires", label: "VALID THROUGH", value: expirationDate },
        ],
        backFields: [
          { key: "state",      label: "STATE",                      value: licenseState },
          { key: "issued",     label: "CREDENTIAL ISSUED",          value: issuedDate },
          { key: "issuer",     label: "CREDENTIAL ISSUED BY",       value: "PassTo — passtodigital.com" },
          { key: "disclaimer", label: "IMPORTANT",                  value: "NOT A VALID PROFESSIONAL CREDENTIAL — SYNTHETIC DEMO DATA ONLY" },
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
      `demo-passes/${credential_id}/${serialNumber}.pkpass`,
      pkpassBuffer,
      { access: "public", contentType: "application/vnd.apple.pkpass" }
    );

    return res.status(200).json({
      success:       true,
      pass_url:      blob.url,
      serial_number: serialNumber,
    });
  } catch (error) {
    console.error("sign-apple-demo error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
