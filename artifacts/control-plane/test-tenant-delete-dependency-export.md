# CONTROL-PLANE-TEST-TENANT-DELETE-DEPENDENCY-EXPORT-IMPLEMENTATION-001

## Executive Summary
- Generated at: 2026-05-26T13:55:22.208Z
- Git HEAD: 0674db0b3a35a708b3d80d4cc73861dd20b91cfb
- Script version: v1.0.0-readonly-export
- This report is read-only. No tenant deletion, archive, lifecycle mutation, or database write was performed.

## Input Summary
- active safe candidates: 22
- closed safe candidates: 25
- protected exclusions: 10
- ambiguous exclusions: 4

## Classification Summary
- DELETE_POSSIBLE: 44
- DELETE_BLOCKED: 3
- DELETE_UNSUPPORTED: 0
- PROTECTED_NO_ACTION: 10
- AMBIGUOUS_NO_ACTION: 4

## DELETE_POSSIBLE subset
- test-tenant-nll-other-f333d3c9-7cc7995d
- test-tenant-nll-owner-f333d3c9-3904418f
- test-tenant-ni-route-other-201518c0
- test-tenant-ni-route-owner-5adce6d0
- test-tenant-sri-other-ada20264
- test-tenant-sri-supplier-2-00f18b4a
- test-tenant-sri-supplier-1-d51e0a13
- test-tenant-sri-owner-66a00c2f
- test-tenant-ns-comp-dup-member-1c37aa07
- test-tenant-ns-prev-mat-member-1ba324dc
- test-tenant-ns-prev-member-a5fbe6d8
- test-tenant-ns-member-org-9faafb2b
- test-tenant-ns-route-other-b33663d6
- test-tenant-ns-route-owner-2c8611a0
- test-tenant-rfq-read-other-094d5dde
- test-tenant-rfq-read-owner-6b707770
- test-tenant-award-route-supplier-e77ec63d
- test-tenant-award-route-owner-7f7f1a07
- test-tenant-rfq-route-other-9eae5cf5
- test-tenant-rfq-route-owner-33416ed7
- test-tenant-nll-other-43b6a714-2d3bf800
- test-tenant-nll-owner-43b6a714-320e600a
- test-tenant-email-verification-1779163982162
- b2c-browse-proof-20260402080229
- activation-verify-2026-04-02-org-status-close-gate-exec
- activation-verify-2026-04-01-deep-dive-exec
- test-tenant-92693230-db1b-464b-be30-27001e6f1075-1daa4fbc
- test-tenant-92693230-db1b-464b-be30-27001e6f1075-4b7e9738
- test-tenant-92693230-db1b-464b-be30-27001e6f1075-af635052
- test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-f678ad58
- test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-4cb0014e
- test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-092a4636
- test-tenant-59d5422e-53f8-4f6a-b023-b7ee85e8ad7c-3df1138c
- test-tenant-59d5422e-53f8-4f6a-b023-b7ee85e8ad7c-1269c633
- test-tenant-59d5422e-53f8-4f6a-b023-b7ee85e8ad7c-e30e20b3
- test-tenant-2c615571-e305-413f-aeac-4731a1b359c3-719592c3
- test-tenant-2c615571-e305-413f-aeac-4731a1b359c3-21245947
- test-tenant-2c615571-e305-413f-aeac-4731a1b359c3-aad3f4ef
- test-tenant-fe163be8-a177-4847-bae2-030eb41cbcb6-51206629
- test-tenant-fe163be8-a177-4847-bae2-030eb41cbcb6-2d974209
- test-tenant-fe163be8-a177-4847-bae2-030eb41cbcb6-d3d6228d
- test-tenant-fff6eb57-fac7-4587-8a35-6cac006f833b-f638febf
- test-tenant-fff6eb57-fac7-4587-8a35-6cac006f833b-254c8dfd
- test-tenant-fff6eb57-fac7-4587-8a35-6cac006f833b-f49b0ca1

## DELETE_BLOCKED subset
- test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-24aa7ecb
- test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-97b96136
- test-tenant-wave2-1774063117878

## DELETE_UNSUPPORTED subset
- none

## Protected No-Action Confirmation
- expected protected rows: 10
- observed protected rows: 10
- all protected classified PROTECTED_NO_ACTION: true

## Ambiguous No-Action Confirmation
- expected ambiguous rows: 4
- observed ambiguous rows: 4
- all ambiguous classified AMBIGUOUS_NO_ACTION: true

## Blocker Histogram
- AMBIGUOUS_REQUIRES_PARESH_DECISION: 4
- BLOCKED_RFQ_DOMAIN_DEPENDENCY: 3
- BLOCKED_TRADE_DOMAIN_DEPENDENCY: 1
- PROTECTED_QA_BASELINE: 7
- PROTECTED_WL_BASELINE: 3

## Per-Tenant Table
| slug | group | status | onboarding | classification | blockers | tradeCount | reasoningLogCount | rfqCountAsBuyer | rfqCountAsSupplier | invoiceCount | dppEvidenceClaimCount | traceabilityNodeCount |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| test-tenant-nll-other-f333d3c9-7cc7995d | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-nll-owner-f333d3c9-3904418f | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-ni-route-other-201518c0 | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-ni-route-owner-5adce6d0 | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-sri-other-ada20264 | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-sri-supplier-2-00f18b4a | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-sri-supplier-1-d51e0a13 | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-sri-owner-66a00c2f | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-ns-comp-dup-member-1c37aa07 | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-ns-prev-mat-member-1ba324dc | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-ns-prev-member-a5fbe6d8 | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-ns-member-org-9faafb2b | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-ns-route-other-b33663d6 | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-ns-route-owner-2c8611a0 | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-rfq-read-other-094d5dde | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-rfq-read-owner-6b707770 | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-award-route-supplier-e77ec63d | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-award-route-owner-7f7f1a07 | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-rfq-route-other-9eae5cf5 | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-rfq-route-owner-33416ed7 | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-nll-other-43b6a714-2d3bf800 | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-nll-owner-43b6a714-320e600a | ACTIVE_SAFE_CANDIDATE | ACTIVE | ACTIVE | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-email-verification-1779163982162 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| b2c-browse-proof-20260402080229 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| activation-verify-2026-04-02-org-status-close-gate-exec | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| activation-verify-2026-04-01-deep-dive-exec | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-24aa7ecb | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_BLOCKED | BLOCKED_RFQ_DOMAIN_DEPENDENCY | 0 | 0 | 0 | 4 | 0 | 0 | 0 |
| test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-97b96136 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_BLOCKED | BLOCKED_TRADE_DOMAIN_DEPENDENCY, BLOCKED_RFQ_DOMAIN_DEPENDENCY | 2 | 0 | 3 | 0 | 0 | 0 | 0 |
| test-tenant-92693230-db1b-464b-be30-27001e6f1075-1daa4fbc | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-92693230-db1b-464b-be30-27001e6f1075-4b7e9738 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-92693230-db1b-464b-be30-27001e6f1075-af635052 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-f678ad58 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-4cb0014e | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-092a4636 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-wave2-1774063117878 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_BLOCKED | BLOCKED_RFQ_DOMAIN_DEPENDENCY | 0 | 0 | 1 | 1 | 0 | 0 | 0 |
| test-tenant-59d5422e-53f8-4f6a-b023-b7ee85e8ad7c-3df1138c | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-59d5422e-53f8-4f6a-b023-b7ee85e8ad7c-1269c633 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-59d5422e-53f8-4f6a-b023-b7ee85e8ad7c-e30e20b3 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-2c615571-e305-413f-aeac-4731a1b359c3-719592c3 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-2c615571-e305-413f-aeac-4731a1b359c3-21245947 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-2c615571-e305-413f-aeac-4731a1b359c3-aad3f4ef | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-fe163be8-a177-4847-bae2-030eb41cbcb6-51206629 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-fe163be8-a177-4847-bae2-030eb41cbcb6-2d974209 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-fe163be8-a177-4847-bae2-030eb41cbcb6-d3d6228d | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-fff6eb57-fac7-4587-8a35-6cac006f833b-f638febf | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-fff6eb57-fac7-4587-8a35-6cac006f833b-254c8dfd | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| test-tenant-fff6eb57-fac7-4587-8a35-6cac006f833b-f49b0ca1 | CLOSED_SAFE_CANDIDATE | CLOSED | CLOSED | DELETE_POSSIBLE | - | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| qa-b2b | PROTECTED_NO_ACTION_INPUT | ACTIVE | ACTIVE | PROTECTED_NO_ACTION | PROTECTED_QA_BASELINE | 1 | 15 | 6 | 13 | 0 | 0 | 2 |
| qa-b2c | PROTECTED_NO_ACTION_INPUT | ACTIVE | ACTIVE | PROTECTED_NO_ACTION | PROTECTED_QA_BASELINE | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| qa-wl | PROTECTED_NO_ACTION_INPUT | ACTIVE | ACTIVE | PROTECTED_NO_ACTION | PROTECTED_QA_BASELINE | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| qa-agg | PROTECTED_NO_ACTION_INPUT | ACTIVE | ACTIVE | PROTECTED_NO_ACTION | PROTECTED_QA_BASELINE | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| qa-pend | PROTECTED_NO_ACTION_INPUT | ACTIVE | PENDING_VERIFICATION | PROTECTED_NO_ACTION | PROTECTED_QA_BASELINE | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| white-label-co | PROTECTED_NO_ACTION_INPUT | ACTIVE | ACTIVE | PROTECTED_NO_ACTION | PROTECTED_QA_BASELINE | 0 | 16 | 3 | 3 | 0 | 0 | 1 |
| wl-verify-s1-20260328-0510 | PROTECTED_NO_ACTION_INPUT | CLOSED | CLOSED | PROTECTED_NO_ACTION | PROTECTED_WL_BASELINE | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| wl-verify-s1-20260328-0445 | PROTECTED_NO_ACTION_INPUT | CLOSED | CLOSED | PROTECTED_NO_ACTION | PROTECTED_WL_BASELINE | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| wl-verify-s1-20260328-0440 | PROTECTED_NO_ACTION_INPUT | CLOSED | CLOSED | PROTECTED_NO_ACTION | PROTECTED_WL_BASELINE | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| white-label-co | PROTECTED_NO_ACTION_INPUT | ACTIVE | ACTIVE | PROTECTED_NO_ACTION | PROTECTED_QA_BASELINE | 0 | 16 | 3 | 3 | 0 | 0 | 1 |
| shraddha-industries | AMBIGUOUS_NO_ACTION_INPUT | ACTIVE | ACTIVE | AMBIGUOUS_NO_ACTION | AMBIGUOUS_REQUIRES_PARESH_DECISION | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| acme-corp-live-verify | AMBIGUOUS_NO_ACTION_INPUT | CLOSED | CLOSED | AMBIGUOUS_NO_ACTION | AMBIGUOUS_REQUIRES_PARESH_DECISION | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ops-casework-seller-681cd6f6 | AMBIGUOUS_NO_ACTION_INPUT | CLOSED | CLOSED | AMBIGUOUS_NO_ACTION | AMBIGUOUS_REQUIRES_PARESH_DECISION | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ops-casework-buyer-e13b66cb | AMBIGUOUS_NO_ACTION_INPUT | CLOSED | CLOSED | AMBIGUOUS_NO_ACTION | AMBIGUOUS_REQUIRES_PARESH_DECISION | 1 | 0 | 0 | 0 | 0 | 0 | 0 |

This report does not authorize deletion. Deletion remains blocked until Paresh approves an exact DELETE_POSSIBLE subset in a later unit.
