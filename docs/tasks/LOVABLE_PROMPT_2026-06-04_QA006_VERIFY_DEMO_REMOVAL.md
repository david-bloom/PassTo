# Lovable Prompt: Remove /verify-demo Route

**Task:** QA-006 remediation — Remove `/verify-demo` route from PassTo App

**Priority:** P1 (public-facing, security/brand risk)

**Date:** 2026-06-04

**Decision authority:** David Bloom

---

## Background

During QA-003 testing, the `/verify-demo` route was found to be:
- Publicly accessible without authentication
- Displaying fabricated nurse credentials (Sarah Johnson, RN, license RN-2024-198234, CA, expiration March 30, 2027)
- Page title: "PassTo — Credential Verification" (indistinguishable from real verification)
- **No DEMO / SAMPLE / FAKE labeling anywhere visible**

This creates a risk of user confusion or accidental credential verification using fake data.

**Decision:** Remove the route entirely (Option A — recommended).

---

## What to Remove

### 1. Route Definition
- Find the route definition for `/verify-demo` in your router configuration
- Delete the entire route (e.g., in `App.tsx` or your routing module)
- Example pattern to search for: `path: "/verify-demo"` or `"/verify-demo"`

### 2. Component Files
- Delete the component file(s) that render `/verify-demo`
- Common names: `VerifyDemo.tsx`, `DemoVerifier.tsx`, `VerificationDemo.tsx`
- Check `src/components` or `src/pages` directories

### 3. Demo Data / Mock Credentials
- Remove any hardcoded demo nurse data associated with this route
- Search for: `"Sarah Johnson"`, `"RN-2024-198234"`, `"March 30, 2027"`
- Delete mock credential objects or data files used by the demo

### 4. Navigation / Links (if any)
- Search codebase for any internal links to `/verify-demo`
- Remove from header, footer, navigation menus, or dev/testing tools
- Remove from README or documentation

### 5. Tests / Test Files (if any)
- Remove any tests specifically for `/verify-demo`
- Search for test files containing `"verify-demo"` or `"VerifyDemo"`

---

## Verification Checklist

After removal and deployment, verify:

- [ ] Route `/verify-demo` no longer exists in router definition
- [ ] Component file(s) deleted
- [ ] Demo data/mock credentials removed
- [ ] No broken import references
- [ ] App builds and deploys successfully
- [ ] Browser navigation to `https://app.passtodigital.com/verify-demo` results in 404 or redirect

---

## Acceptance Criteria

✅ **Route completely removed** from deployed App bundle
✅ **No orphaned components or data** referencing the demo
✅ **No build errors or warnings** introduced
✅ **Live deployment** includes the removal

---

## Test Plan (Claude will execute after deployment)

Once you deploy the removal, Claude QA will:

1. Navigate to `https://app.passtodigital.com/verify-demo`
2. Verify HTTP 404 response (or redirect)
3. Confirm no demo credentials displayed
4. Document evidence in QA-006 finding card
5. Update QA log status to `applied`

---

## Timeline

- **Execution:** Remove route, build, deploy
- **Verification:** Immediate once live (within minutes)
- **QA closure:** After verification confirms 404

---

## Questions?

If you need clarification on what to remove, search your codebase for `verify-demo` (case-insensitive) to find all related code.

Once deployed and live, notify Claude to proceed with verification.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
