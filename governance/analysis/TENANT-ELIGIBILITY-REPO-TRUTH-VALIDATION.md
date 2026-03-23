# TENANT-ELIGIBILITY-REPO-TRUTH-VALIDATION-001

Date: 2026-03-23
Type: GOVERNANCE ANALYSIS
Status: RECORDED
Scope: Repo-truth and governance-truth validation only. No implementation authorized. No Layer 0 status transition.

## Original Pending-Candidate Framing

The pending framing treated the observed message `No eligible member found for this tenant.` as if it
could represent a separate tenant-eligibility candidate.

This analysis validates whether that framing corresponds to a real current sequencing candidate,
whether it is actually a narrower validation or business-rule outcome inside another flow, whether
it was already governed elsewhere, or whether the candidate is insufficiently evidenced.

## Repo-Truth Evidence

### 1. The exact message exists in the current repo

The exact message exists in `App.tsx`.

It is set only in the control-plane impersonation start path after tenant detail is fetched and the
UI attempts to choose a target member user to impersonate.

This is direct repo evidence that the observed outcome is real as a current UI string.

### 2. Exact source and condition of the message

Current source path in `App.tsx`:

1. fetch tenant detail via `getTenantById(tenant.id)`
2. read `detail.tenant.memberships ?? []`
3. select a preferred target in this order:
   - `OWNER` with `ACTIVE` status
   - `ADMIN` with `ACTIVE` status
   - any `ACTIVE` membership
   - otherwise `members[0]`
4. if no target exists, set the dialog error to `No eligible member found for this tenant.`

That means the message is produced only when the memberships array is empty or absent.

It is not currently produced for:

- inactive-only memberships, because `members[0]` is still accepted
- role mismatch alone
- a separate tenant status failure
- a failed server-side impersonation eligibility check

### 3. The message wording is broader than the actual current condition

Current repo truth does not implement a rich eligibility rule here.

The current client path is effectively:

- prefer active owner/admin/active member
- otherwise use the first returned membership anyway
- only error when there are no returned memberships at all

So the current string says `eligible member`, but the actual present condition is narrower:

- no membership row was available in the tenant detail response for target selection

That is a meaningful repo-truth distinction.

### 4. Server-side impersonation validation is narrower and different

The server start-impersonation service validates only:

1. tenant exists
2. tenant status is `ACTIVE`
3. selected `userId` is a member of the tenant

If the chosen user is not a member, the server returns `USER_NOT_MEMBER`.

The current client-side `No eligible member found for this tenant.` message is therefore not the
canonical server rule. It is a client-side preflight or selection failure before the server call is
even made.

### 5. Surrounding flow is impersonation-specific, not a general tenant-eligibility subsystem

The message is inside the control-plane impersonation dialog flow.

It is not part of:

- login membership verification
- tenant onboarding activation
- tenant trade creation placement
- generic tenant-shell routing
- a standalone tenant-governance eligibility engine

Repo truth therefore ties this observation to impersonation target-member resolution only.

## Governance-History Evidence

### 1. No governance unit for this exact message or candidate was found

This analysis found no current governance unit, decision, or closure record that explicitly captures:

- the exact message `No eligible member found for this tenant.`
- a standalone tenant-eligibility candidate built from that message
- a previously resolved or deferred unit for this specific surface

### 2. Existing governed impersonation work is adjacent but not this issue

Current governance history already governs several impersonation-adjacent surfaces, including:

- impersonation session rehydration
- impersonation stop-path cleanup candidate preservation
- control-plane identity truth

None of the inspected records identified this exact empty-membership selection outcome as a named,
bounded governed defect.

### 3. Broader membership or provisioning references do not govern this exact surface

The repo contains historical governance references that provisioning tables such as `memberships`
were deferred in broader workstreams, but those references do not establish this exact UI message as
an active current sequencing candidate.

## Current Exact Status

Current exact repo and governance truth is:

1. the exact message exists in current frontend code
2. it is produced only in the control-plane impersonation start flow
3. the current client condition is effectively `no memberships returned for tenant detail`
4. the current message wording overstates the actual implemented rule by calling it `eligible`
5. no standalone governance candidate or resolved unit for this exact surface was found
6. current evidence does not support treating this as an active broad tenant-eligibility sequencing
   candidate

## Exact Source / Condition Of The Eligibility Outcome

Exact current source: `App.tsx` control-plane impersonation-start handler.

Exact current condition:

- `detail.tenant.memberships` resolves to `[]` or is absent
- no fallback target user can be selected
- the UI raises `No eligible member found for this tenant.` and returns without calling the server

Current equivalent normalized statement:

- no impersonation target membership was available in the fetched tenant detail payload

## Relationship To Adjacent Domains It Must Remain Separate From

This finding must remain separate from all of the following:

1. impersonation session lifecycle defects such as reload or stop-path behavior
2. auth-shell transition or auth-session instability
3. control-plane identity-truth defects
4. tenant trade creation placement or any tenant trade ownership decision
5. broader tenant runtime failures
6. generic membership architecture redesign

Even though the message appears in an impersonation-start path, the validated question here is only
the narrow target-member selection outcome that produces this string.

## Exact Classification

`insufficient evidence`

Reason:

- the message exists, but it is only a local UI preflight string in one impersonation-adjacent path
- current repo truth shows a narrower empty-membership selection condition, not a proven broad
  tenant-eligibility defect family
- no governance history was found that already names or sequences this as a bounded candidate
- current evidence is not sufficient to justify a separately active future sequencing candidate in
  its current broad form

## Risks / Ambiguities

1. the current message wording is misleading because the implemented condition is effectively `no
   memberships returned`, not a fuller eligibility calculation
2. because the client falls back to `members[0]`, inactive memberships can still be selected,
   making the word `eligible` even less precise as a description of current behavior
3. no runtime evidence was gathered here, so this analysis cannot distinguish between:
   - a legitimate tenant with zero memberships
   - a data-shape omission in the tenant detail response
   - an operator-observed path that may have been transient or environment-specific
4. if future evidence emerges, the narrower issue may belong inside impersonation target-member
   resolution rather than under a generic tenant-eligibility name

## Recommended Future Handling

Do not treat `tenant eligibility` as an active bounded sequencing candidate on current evidence.

If future direct evidence is collected, the next truthful handling should be one of these narrower
forms:

1. rename the issue around impersonation target-member resolution or empty-membership handling
2. split only if future evidence proves both:
   - a data-source problem in tenant detail membership payloads, and
   - a separate business-rule or UX problem in client target selection
3. otherwise leave this parked until there is direct evidence that the observed outcome is more than
   a local validation string or under-specified preflight branch

## Confidence Level

Confidence: HIGH

Basis for confidence:

1. direct repo inspection of the exact message source in `App.tsx`
2. direct repo inspection of the control-plane tenant detail payload and impersonation start service
3. direct governance-history inspection showing no standalone governed unit for this surface
4. clear separation from already governed impersonation, auth-shell, identity-truth, and trade
   placement units

## Final Validation Statement

The exact message `No eligible member found for this tenant.` exists in the current repo, but it is
not evidence of a separately governed broad tenant-eligibility defect.

Current repo truth shows a narrower client-side impersonation target-member selection branch that is
reached only when no memberships are returned for the selected tenant detail payload. Governance
history does not show this as an already governed or currently active bounded candidate.

The exact current classification is therefore `insufficient evidence`, and this should not remain an
active future sequencing candidate in its current broad tenant-eligibility framing.