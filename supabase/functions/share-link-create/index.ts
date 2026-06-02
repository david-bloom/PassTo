import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_ORIGIN = 'https://enroll.passtodigital.com'
const SHARE_LINK_TTL_HOURS = 72
const SHAREABLE_CREDENTIAL_STATUSES = new Set(['active'])

const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

async function generateShareToken(): Promise<{ raw: string; hash: string }> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const raw = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(raw),
  )
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return { raw, hash }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'missing_auth' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const shareLinkBase =
    Deno.env.get('SHARE_LINK_BASE_URL') ?? 'https://passtodigital.com/v'

  try {
    // Verify JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) return jsonResponse({ error: 'unauthorized' }, 401)

    const svc = createClient(supabaseUrl, supabaseServiceKey)

    // Gate 1: profile — active account + IAL2 identity
    const { data: profile, error: profileErr } = await svc
      .from('profiles')
      .select(
        'id, account_status, subscription_tier, id_verification_status, id_verification_level',
      )
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) return jsonResponse({ error: 'profile_not_found' }, 403)
    if (profile.account_status !== 'active') {
      return jsonResponse({ error: 'account_not_active' }, 403)
    }
    if (
      profile.id_verification_status !== 'verified' ||
      profile.id_verification_level !== 'IAL2'
    ) {
      return jsonResponse({ error: 'identity_not_verified' }, 403)
    }

    // Gate 2: primary credential — must be active
    const { data: credential, error: credErr } = await svc
      .from('credentials')
      .select('id, status, license_id')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (credErr) {
      console.error('credential read error:', credErr.message)
      return jsonResponse({ error: 'credential_read_error' }, 500)
    }
    if (!credential) return jsonResponse({ error: 'credential_not_found' }, 403)
    if (!SHAREABLE_CREDENTIAL_STATUSES.has(credential.status)) {
      return jsonResponse(
        { error: 'credential_not_shareable', credential_status: credential.status },
        403,
      )
    }

    // Gate 3: license — Active status + identity/license binding confirmed
    const { data: license, error: licenseErr } = await svc
      .from('licenses')
      .select('id, normalized_status, data_match_passed')
      .eq('id', credential.license_id)
      .eq('profile_id', profile.id)
      .maybeSingle()

    if (licenseErr) {
      console.error('license read error:', licenseErr.message)
      return jsonResponse({ error: 'license_read_error' }, 500)
    }
    if (!license) return jsonResponse({ error: 'license_not_found' }, 403)
    if (license.normalized_status !== 'Active') {
      return jsonResponse(
        { error: 'license_not_active', normalized_status: license.normalized_status },
        403,
      )
    }
    if (!license.data_match_passed) {
      return jsonResponse({ error: 'license_match_not_passed' }, 403)
    }

    // Gate 4: entitlement — free tier always allowed; paid tier requires active subscription row
    if (profile.subscription_tier !== 'free') {
      const { data: sub } = await svc
        .from('subscriptions')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
      if (!sub) return jsonResponse({ error: 'subscription_not_confirmed' }, 403)
    }

    // Generate 32-byte high-entropy token; store only hash
    const { raw, hash } = await generateShareToken()
    const expiresAt = new Date(
      Date.now() + SHARE_LINK_TTL_HOURS * 60 * 60 * 1000,
    ).toISOString()

    // Audit event — fail-closed before token insert
    const { error: auditErr } = await svc.from('audit_events').insert({
      actor_id: profile.id,
      action: 'create',
      resource_type: 'verification_token',
      resource_id: null,
      change_after: {
        token_type: 'share_link',
        credential_id: credential.id,
        license_id: license.id,
        expires_at: expiresAt,
      },
    })

    if (auditErr) {
      console.error('audit insert failed:', auditErr.message)
      return jsonResponse({ error: 'audit_failed' }, 500)
    }

    // Insert token hash (raw token never stored)
    const { error: tokenErr } = await svc.from('verification_tokens').insert({
      profile_id: profile.id,
      credential_id: credential.id,
      token_hash: hash,
      token_type: 'share_link',
      status: 'active',
      expires_at: expiresAt,
    })

    if (tokenErr) {
      console.error('token insert failed:', tokenErr.message)
      return jsonResponse({ error: 'token_creation_failed' }, 500)
    }

    // Return raw token once — caller must not persist it server-side
    return jsonResponse({
      share_url: `${shareLinkBase}/${raw}`,
      expires_at: expiresAt,
      token_type: 'share_link',
    })
  } catch (err) {
    console.error('share-link-create unexpected error:', err)
    return jsonResponse({ error: 'internal_error' }, 500)
  }
})
