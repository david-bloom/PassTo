# TASK-0074 - Lovable Same-Origin Rewrite Spec

**Task:** TASK-0074
**Stage:** Stage 1 Engineering Validation
**Approval:** APPROVAL-0037
**Pattern:** A (Lovable same-origin rewrite) - per the Environment Isolation
Manifest `allowed.verifier_endpoint_routing_pattern = "lovable_rewrite"`.

## Purpose

The verifier-session cookie contract (`demo_vs`, `HttpOnly`, `Secure`,
`SameSite=Strict`, `Domain=demo.passtodigital.com`) only works if the
verifier Edge Function endpoints are reachable from the browser at URLs
on `demo.passtodigital.com`. The browser must see Set-Cookie responses
from the same origin as the verifier page in order to store the cookie
and send it on subsequent subresource requests.

This spec defines the Lovable rewrite configuration that satisfies that
requirement without changing the Supabase Edge Function deployment shape.

## Required Rewrites

All four verifier Edge Function endpoints must be reachable from the
browser at the demo domain. Rewrites proxy these to the Supabase Edge
Function URLs server-side; the browser only sees the demo domain.

| Browser-visible URL | Rewritten to (server-side) |
|---|---|
| `https://demo.passtodigital.com/functions/v1/demo-verifier-view` | `https://atnmcjkjshyqcttnmzkq.functions.supabase.co/demo-verifier-view` |
| `https://demo.passtodigital.com/functions/v1/demo-verifier-view-selfie` | `https://atnmcjkjshyqcttnmzkq.functions.supabase.co/demo-verifier-view-selfie` |
| `https://demo.passtodigital.com/functions/v1/demo-verifier-mint-selfie` | `https://atnmcjkjshyqcttnmzkq.functions.supabase.co/demo-verifier-mint-selfie` |
| `https://demo.passtodigital.com/functions/v1/demo-verifier-close` | `https://atnmcjkjshyqcttnmzkq.functions.supabase.co/demo-verifier-close` |

## Required Pass-Through Headers

The rewrite must propagate the following headers transparently in both
directions:

**Request -> origin:**

- `Cookie` (so `demo_vs` reaches the Supabase Edge Function for validation)
- `Authorization` (for any Authenticated demo function reached via the
  same prefix in future iterations; verifier endpoints themselves do not
  use Authorization)
- `Content-Type`
- `Accept`
- `X-Forwarded-For` / `X-Real-IP` (the Edge Function uses this for
  per-IP rate limiting)

**Response -> browser:**

- `Set-Cookie` (so `demo_vs` reaches the browser cookie jar with the
  `Domain=demo.passtodigital.com` attribute intact)
- `Cache-Control`, `Content-Type`, `Content-Disposition`
- Any `Access-Control-*` headers emitted by the function

## Lovable Configuration (preferred surface)

Apply via Lovable's project settings UI under **Custom Domain ->
Rewrites** (or the equivalent surface in Lovable's current version):

```
Source: /functions/v1/demo-verifier-:rest*
Destination: https://atnmcjkjshyqcttnmzkq.functions.supabase.co/demo-verifier-:rest*
Type: Rewrite (server-side proxy, NOT a redirect)
Pass headers: Cookie, Authorization, Content-Type, Accept
```

Confirm in Lovable's docs that "Rewrite" semantics include `Set-Cookie`
pass-through. If only a Redirect-type rule is offered, do NOT use it -
a redirect will break the cookie contract because the browser will issue
a fresh request directly to the Supabase domain, and the Set-Cookie
response will arrive cross-origin and be dropped.

## Fallback Format (Netlify-style _redirects)

If Lovable accepts a checked-in `_redirects` file:

```
# TASK-0074 - same-origin verifier endpoint rewrite (NOT a redirect)
/functions/v1/demo-verifier-:rest*   https://atnmcjkjshyqcttnmzkq.functions.supabase.co/demo-verifier-:rest*   200
```

The `200` status code makes this a proxy rewrite, not a 301/302 redirect.

## QA Gate

Before Stage A, manual browser verification at
`https://demo.passtodigital.com/v/<dummy_share_token>`:

1. DevTools Network tab: the request to `/functions/v1/demo-verifier-view`
   shows `https://demo.passtodigital.com/...` in the URL column (NOT the
   Supabase project domain).
2. DevTools Application > Cookies > `demo.passtodigital.com` shows the
   `demo_vs` cookie with all expected attributes after the response.
3. A subsequent `demo-verifier-mint-selfie` call automatically carries
   the `demo_vs` cookie in the request headers.
4. Negative control: bypass the rewrite by calling the Supabase function
   URL directly. The `demo_vs` cookie is not stored (cross-origin), and
   any subsequent call to the rewritten URL does not send it.

These outcomes correspond to the `Same-origin routing tests` group in
the TASK-0074 QA Plan.

## Failure Modes to Avoid

- **Redirect instead of rewrite.** Set-Cookie attaches to the
  cross-origin Supabase response and is dropped by the browser.
- **Stripping of Set-Cookie.** Some CDN rewrite implementations strip
  cookies by default. Verify Set-Cookie pass-through during the QA
  gate; if Lovable's rewrite cannot pass cookies, fall back to Pattern
  B (Supabase Edge Function custom domain) and update the manifest.
- **Path mismatch.** The browser-visible path must exactly equal
  `/functions/v1/demo-verifier-...` so the `Path` cookie attribute
  matches. A different rewrite source path (e.g., `/api/...`) requires
  updating `allowed.verifier_endpoint_path_prefix` in the manifest and
  the cookie helper.

## If Pattern A Is Not Feasible

If Lovable's rewrite surface cannot pass Set-Cookie correctly, switch
to Pattern B (Supabase Edge Function custom domain):

1. In the Supabase dashboard for `atnmcjkjshyqcttnmzkq`, bind a custom
   domain (e.g., `api.demo.passtodigital.com`) to the Edge Functions
   runtime.
2. Update the manifest:
   - `allowed.verifier_endpoint_origin = "https://api.demo.passtodigital.com"`
   - `allowed.verifier_endpoint_routing_pattern = "supabase_custom_domain"`
   - `allowed.verifier_session_cookie_domain = ".demo.passtodigital.com"`
3. Update DNS for `api.demo.passtodigital.com` (CNAME or A record per
   Supabase instructions).
4. Re-run the QA gate.
