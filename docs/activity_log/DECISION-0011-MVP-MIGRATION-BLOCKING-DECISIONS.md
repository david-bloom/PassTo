# DECISION-0011 — MVP Migration-Blocking Decisions

**Date:** 2026-05-24  
**Decision Owner:** David  
**Status:** Approved  
**Related Task:** Claude Task 001 — Supabase MVP Schema Spike  
**Area:** Product / Architecture / Security / Data / Pricing  

---

## Context

Claude Task 001 and Codex QA identified several decisions that must be settled before the Supabase MVP schema migration can be approved.

---

## Approved Decisions

David approved the following MVP decisions:

1. **Data retention:** Retain operational, audit, payment, and verification records for 7 years unless legal counsel later changes this.

2. **Share-link verification token TTL:** Verification tokens expire after 72 hours or first successful use, whichever comes first.

3. **Show-QR token TTL:** Show-QR tokens expire after 45 minutes or first use, whichever comes first.

4. **Free-tier license entitlement:** Free users may maintain 1 license only and cannot purchase additional licenses in MVP.

5. **Paid additional-license entitlement:** Standard users include 1 license and may buy additional licenses for $4.99 each. Premier users include 2 licenses and may buy additional licenses for $4.99 each.

6. **Subscription pricing:** Standard is $9.99/month. Premier is $19.99/month.

7. **PDF storage:** Generated PDFs are stored in Supabase Storage.

8. **PDF records:** PDF records are tracked in a `pdf_exports` table.

9. **PDF access control:** PDF download access is controlled by authenticated nurse access or short-lived signed URLs.

10. **PDF disclaimer:** PDFs are static records and include the approved static PDF disclaimer.

---

## Rationale

These decisions reduce schema ambiguity before migration and keep the MVP commercially simple while preserving records needed for payment, audit, verification, support, and operational traceability.

---

## Consequences

- The Supabase schema should support 7-year operational, audit, payment, and verification record retention.
- Token TTL behavior must distinguish share links from show-QR tokens.
- Free-tier users should not be able to purchase additional licenses in MVP.
- Standard and Premier plans require support for paid additional-license purchases beyond included entitlements.
- Stripe setup can use Standard at $9.99/month and Premier at $19.99/month.
- PDF storage should use Supabase Storage with `pdf_exports` metadata and gated/signed access.

---

## Follow-ups

- PDF QR token TTL still requires confirmation if PDF QR remains in MVP.
- Terms of Use still requires final drafting.
- Legal counsel may later modify the 7-year retention period.

---

## Source Note

This file exists because the full `/docs/activity_log/DECISIONS_LOG.md` replacement was blocked by the GitHub connector safety layer. Until the main decisions log is consolidated, this decision file is active source-of-truth documentation and should be read with the decisions log.
