# PassTo Handoff Packet Template

**Status:** Approved Shared Workflow  
**Owner:** David  
**Created:** 2026-06-02  
**Applies To:** Codex, Claude, Lovable, QA, and side-agent handoffs  

---

## Purpose

Use this packet before handing work to Claude, Codex QA, Lovable, or a side agent.

The packet keeps PassTo handoffs compact, source-linked, and approval-aware.

---

## Template

```text
Task:
- TASK-XXXX — Title

Current GitHub Source:
- Task doc:
- Related PRD/flow docs:
- Relevant issue/comment:
- Latest commits reviewed:

Approval State:
- Approved:
- Not approved:
- Required before execution:

Live Supabase State:
- Project:
- Migrations:
- Edge Functions:
- Grants/RLS:
- Logs:
- Not checked / unavailable:

Files / Functions Affected:
- Docs:
- Supabase functions:
- Migrations:
- Lovable routes:
- Stripe:
- Other:

Open Risks / Blockers:
- P1:
- P2:
- Pending David decisions:

Do Not Touch:
- Scope exclusions:
- Deferred features:
- Production-impacting actions without approval:

Next Expected Output:
- Spec / implementation / QA / prompt / issue comment:
- Required files to update:
- Required evidence:

Recommended Prompt for Claude:
"""
[Paste concise execution instruction here.]
"""

Recommended Prompt for Codex QA:
"""
[Paste concise QA instruction here.]
"""

Recommended Prompt for Lovable:
"""
[Paste concise Lovable instruction here.]
"""
```

---

## Use Rules

- Do not include stale chat-only decisions unless they have been recorded in GitHub.
- If live Supabase state matters, verify it or mark it unchecked.
- If David approval is required, state exactly what approval is needed.
- For implementation handoffs, name the expected write scope.
- For QA handoffs, include acceptance criteria and evidence already reviewed.
- For Lovable handoffs, include forbidden client writes and backend functions/routes to call.

---

## When To Provide This Packet

Provide a handoff packet:

- Before Claude executes a task or remediation.
- Before Codex QA or re-QA.
- Before Lovable receives a frontend prompt that depends on backend contracts.
- Before a side agent starts a focused investigation if the task context is complex.
- Whenever a task changes owner.

For tiny status questions or simple read-only checks, a full packet is optional.

