# ADDITIONAL-REPO-TRUTH-CANDIDATES

Date: 2026-03-23
Unit: ADDITIONAL-REPO-TRUTH-CANDIDATES-001
Scope: Secret-safe bounded repo/governance scan for materially relevant additional sequencing candidates not already represented in the normalized Step 2 pending ledger.

## Scan Scope Summary

This scan was intentionally bounded to the following allowlisted discovery surfaces only:

- `governance/**/*.md`
- `components/**`
- `layouts/**`
- `services/**`
- `server/src/**`
- `server/docs/**`
- `shared/**`
- `src/**`

Excluded from discovery: env/config secret-bearing files, backups, logs, build/dist output, artifacts, generated output, temp directories, and non-allowlisted search surfaces.

## Discovery Method Summary

Method used:

1. Restore current governance posture from Layer 0 control files.
2. Compare current repo/governance evidence against the canonical normalized Step 2 ledger in `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md`.
3. Search only within the allowlisted surfaces for exact deferred/stub/exposed-runtime markers.
4. Promote only findings that are both strongly evidenced in current repo state and materially relevant to future sequencing.
5. Classify all other findings as one of: already governed elsewhere, already resolved/stale, informational only, or possible candidate / insufficient evidence.

## Already-Normalized Exclusions

The following families remain governed by the existing normalized Step 2 ledger and were not re-opened here:

- impersonation stop-path / cleanup
- tenant eligibility
- auth/session instability
- tenant-runtime-other
- B2C New Arrivals placeholder-image fallback surface
- media behavior

Those normalized families remain canonical in `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md`. This scan looked only for materially relevant additional survivors outside that already-normalized set.

## Additional Findings

| Candidate / Surface | Current Repo Evidence | Classification | Why It Matters | Bounded Sequencing Note |
| --- | --- | --- | --- | --- |
| Certification lifecycle transition/logging gap | `components/Tenant/CertificationsPanel.tsx` exposes a tenant transition form; `services/certificationService.ts` exports `transitionCertification()` as a live client helper; `server/src/routes/tenant/certifications.g019.ts` exposes `POST /api/tenant/certifications/:id/transition`; `server/src/services/certification.g019.service.ts` states the state machine always returns `CERTIFICATION_LOG_DEFERRED`; `server/src/services/stateMachine.service.ts` denies `CERTIFICATION` transitions because no `certification_lifecycle_logs` table exists; `governance/wave-execution-log.md` still carries the older future-reference that `G-023` would later add the handler even though `G-023` is already closed for a different scope. | New high-confidence candidate | There is an exposed tenant-visible transition surface, a live route, and a live client helper, but current backend behavior still cannot apply certification transitions because the lifecycle-log persistence path is absent. This is not just stale commentary; it is active behavior. | If sequenced later, keep it narrow: certification transition applicability plus lifecycle-log persistence only. Do not merge metadata PATCH UI, broader certification redesign, maker-checker mutation expansion, or schema-wide certification refactoring into the same unit. |
| Deeper hidden exception behind the degraded AI-insights fallback | `governance/control/OPEN-SET.md` and recent governance log history preserve the note that the degraded fallback may still be masking a deeper hidden exception; `services/aiService.ts` still contains a generic fallback path that surfaces backend error text for non-budget/auth failures. | Possible candidate / insufficient evidence | The repo preserves a plausible follow-on concern, but current bounded evidence does not prove an active hidden backend exception beyond the already-governed degraded fallback behavior. | Do not promote this into a new sequencing candidate without fresh exact evidence that identifies the underlying exception source or reproduces a distinct hidden failure path. |
| Maker-checker sign/replay control-plane mutation wiring | Control-plane UI remains read-only on the exposed console surfaces; `governance/gap-register.md` already preserves the deferred exact surface as `MAKER-CHECKER-MUTATION-DEFERRED`. | Already governed elsewhere | This remains a real deferred surface, but it is not an unlisted survivor. Governance already records it. | Keep under the existing deferred maker-checker mutation record; do not duplicate it here as a new candidate. |
| Vector shadow query placeholder embedding | `server/src/lib/vectorShadowQuery.ts` still contains a placeholder embedding TODO; `governance/gap-register.md` already preserves the follow-on as `PW5-SHADOW-QUERY-FIX`. | Already governed elsewhere | The placeholder embedding remains current repo truth, but the future-sequencing record already exists. | Keep under the existing shadow-query follow-on; do not create a parallel candidate. |
| Certification metadata PATCH UI absence | `services/certificationService.ts` explicitly notes that PATCH UI is deferred; governance history for `TECS-FBW-005` already recorded that the function exists while PATCH UI remained deferred. | Informational only / already governed elsewhere | This is a known bounded omission, but it is not the strongest live certification blocker. The materially more relevant surviving certification truth is the transition/logging gap above. | Do not promote as a separate new candidate unless future governance explicitly chooses to sequence certification metadata editing as its own bounded slice. |

## Final Conclusion

Result: exactly one additional high-confidence repo-truth candidate was identified outside the normalized Step 2 ledger.

That candidate is:

- Certification lifecycle transition/logging gap

Why it survives promotion:

- the transition surface is visibly exposed in current tenant UI
- the frontend client and tenant route are live
- the backend service currently documents and returns a non-applied path
- the state machine explicitly refuses certification transitions because lifecycle-log persistence is missing
- current governance history still points the missing handler at a now-closed unrelated unit, which increases the likelihood that this exact gap could otherwise be lost in sequencing

No other scanned surface met the same threshold. Other findings were either already normalized, already governed elsewhere, already deferred within prior bounded scope, or still lacked enough exact current evidence for promotion.

## Layer 0 Impact

None. Layer 0 control files remain unchanged for this artifact class.