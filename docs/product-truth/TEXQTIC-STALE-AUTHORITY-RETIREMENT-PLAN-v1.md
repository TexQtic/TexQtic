# TEXQTIC-STALE-AUTHORITY-RETIREMENT-PLAN-v1

## Purpose

This document defines the Phase 4 retirement plan for stale or conflicting authority surfaces in TexQtic.

This phase is planning only.

It does not relabel, retire, archive, delete, or modify any existing doctrine, planning, README, or governance document.

Its purpose is to classify existing documents by authority role and determine which documents:

- currently act as execution authority that conflicts with the new product-truth set
- should be retained as reference-only or historical knowledge
- require targeted review because they contain both authority-bearing and reference value

## Phase 4 Operating Rules

1. Do not assume all legacy doctrine or planning documents must be retired.
2. Distinguish execution authority from reference or historical knowledge.
3. New product-truth authority must exist before any old authority is retired.
4. This phase is classification-driven and non-destructive.
5. No existing document is relabeled or modified in this phase.

## Current Replacement Authority Base

The following product-truth documents now exist as the replacement authority base:

- `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md`
- `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md`
- `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md`

This retirement plan does not assume those documents are ready to displace old authority everywhere immediately.

Retirement execution is gated on:

1. the replacement authority base existing in full
2. cross-document consistency review confirming that the replacement set is internally coherent
3. per-document classification approval confirming whether the old document is authority-bearing, reference-only, or mixed
4. a later execution phase explicitly authorizing any relabeling, pointer stubs, or retirement actions

## Classification Model

This plan uses two primary document classes.

### Class A — Authority-Bearing Documents

A document is authority-bearing if it currently claims or implies any of the following:

1. implementation law
2. binding sequencing authority
3. mandatory read-first execution guidance
4. locked product truth that directs what should be built next

Authority-bearing documents are the only documents eligible for authority retirement or de-authorization in a later phase.

### Class B — Reference-Only Documents

A document is reference-only if it primarily serves one of the following roles:

1. historical record
2. design context
3. philosophical background
4. frozen archive
5. advisory or draft positioning knowledge

Reference-only documents may be retained and preserved even if they overlap with product-truth themes, provided they do not remain active execution authority.

## Action Types

This plan also distinguishes between classification and later action.

Possible later actions are:

- `DEAUTHORIZE_AND_RETAIN` — remove execution authority later, but preserve the document as reference
- `RETAIN_AS_REFERENCE` — preserve as-is or later relabel as reference-only; no retirement from the repo is required
- `MIXED_REVIEW_REQUIRED` — document contains authority-bearing and reference value; later phase must decide whether to de-authorize wholly or narrow its scope
- `NO_ACTION_IN_SCOPE` — document is not part of the stale-authority retirement target set for product-truth replacement

No action is executed in this phase.

## Classification Register — Authority-Bearing Documents

| Document Path | Current Signal | Classification | Conflict With New Product-Truth Authority | Planned Later Action | Reason |
|---|---|---|---|---|---|
| `docs/README.md` | Declares docs directory to be binding authority and implementation law | `AUTHORITY_BEARING` | High | `DEAUTHORIZE_AND_RETAIN` | It asserts global execution authority for doctrine-led documentation and directly conflicts with the new product-truth authority base |
| `README.md` | Presents legacy platform definition, phase model, and repo truth as top-level guidance | `AUTHORITY_BEARING` | High | `DEAUTHORIZE_AND_RETAIN` | It remains a high-visibility product/planning entry point and materially conflicts with corrected product truth and current repo reality |
| `docs/north-star/TEXQTIC_PRODUCT_NORTH_STAR.md` | Locked product north star with implementation-binding posture | `AUTHORITY_BEARING` | High | `DEAUTHORIZE_AND_RETAIN` | It still acts as locked product truth and sequencing context, but A1 established a corrected product definition |
| `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md` | Historical master plan with roadmap, dependency graph, and recommended execution sequence | `AUTHORITY_BEARING` | High | `DEAUTHORIZE_AND_RETAIN` | It still reads as execution sequencing authority and conflicts with the new dependency-first product-truth roadmap |
| `docs/doctrine/doctrine_v1_4_part_1_EXECUTABLE.md` | Executable doctrine; implementation-binding | `AUTHORITY_BEARING` | Mixed / review needed | `MIXED_REVIEW_REQUIRED` | It may contain domain-level engineering authority that should remain, but any product-truth or sequencing claims must not override the new product-truth set |
| `docs/doctrine/doctrine_v1_4_part_2_EXECUTABLE.md` | Executable doctrine; implementation-binding | `AUTHORITY_BEARING` | Mixed / review needed | `MIXED_REVIEW_REQUIRED` | Same classification logic as Part 1; not assumed fully stale, but not automatically exempt from review |
| `docs/doctrine/doctrine_v1_4_part_3_EXECUTABLE.md` | Executable doctrine; implementation-binding | `AUTHORITY_BEARING` | Mixed / review needed | `MIXED_REVIEW_REQUIRED` | Explicit review candidate; may retain technical reference value, but must not continue as blanket product or sequencing authority without review |
| `docs/doctrine/doctrine_v1_4_part_4_EXECUTABLE.md` | Executable doctrine; implementation-binding | `AUTHORITY_BEARING` | Mixed / review needed | `MIXED_REVIEW_REQUIRED` | Same classification logic as other executable doctrine parts; review required before any later retirement decision |

## Classification Register — Reference-Only Documents

| Document Path | Current Signal | Classification | Planned Later Action | Reason |
|---|---|---|---|---|
| `governance/archive/README.md` | Frozen archive guidance; explicitly states archived files have no operational authority | `REFERENCE_ONLY` | `RETAIN_AS_REFERENCE` | It already behaves as historical guidance and does not claim product-truth execution authority |
| `docs/archive/TEXQTIC_PRODUCT_NORTH_STAR_V1.md` | Archived prior north star | `REFERENCE_ONLY` | `RETAIN_AS_REFERENCE` | Historical product record; should be preserved as prior-state context rather than treated as current truth |
| `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md` | Draft positioning addendum pending ratification | `REFERENCE_ONLY` | `RETAIN_AS_REFERENCE` | It is explicitly draft and advisory until ratified; it should not be treated as current execution authority |

## Documents Outside This Retirement Scope

The following document class is not a stale-authority retirement target in this plan:

- active governance OS design and control-plane files whose purpose is governance architecture rather than product-truth execution replacement

Example:

- `docs/governance/control/GOV-OS-001-DESIGN.md`

These files may remain authoritative for governance operating-model structure while product-truth authority is replaced elsewhere.

This plan therefore classifies them as:

- `NO_ACTION_IN_SCOPE`

## Authority-Retirement Gate

No authority-bearing document may be retired, relabeled, downgraded, or pointer-stubbed until all of the following are true:

1. `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md` exists
2. `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md` exists
3. `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md` exists
4. this retirement plan exists
5. a consistency review confirms these documents do not conflict with each other
6. each target document has an explicit replacement mapping
7. a later execution phase authorizes the non-destructive retirement step

This gate is mandatory.

Replacement authority must exist before old authority is retired.

## Replacement Mapping Requirements

Before any later retirement execution, every authority-bearing target must be mapped to one or more replacement documents.

Minimum mapping rules:

1. product-truth definition conflicts map to the gap register and roadmap
2. execution-sequencing conflicts map to the roadmap and next-delivery plan
3. launch-critical closure logic maps to the next-delivery plan
4. historical or philosophical context must be preserved rather than deleted

If no replacement mapping exists, the old authority document cannot be retired yet.

## Later Execution Strategy

The later retirement execution phase should apply the following order:

1. confirm replacement truth set consistency
2. confirm document-by-document classification approval
3. de-authorize only the documents that currently conflict as execution authority
4. preserve historical and reference-only materials
5. avoid destructive deletion unless a later explicitly approved archival action requires it

The target outcome is not “remove old docs.”

The target outcome is “remove stale execution authority while preserving useful historical and reference knowledge.”

## What This Plan Explicitly Avoids

This plan does not:

1. declare every doctrine document stale
2. declare every planning document obsolete
3. force historical material into deletion
4. modify any existing file in this phase
5. collapse governance architecture files into product-truth retirement scope

## Phase 4 Exit Criteria

Phase 4 is complete when:

1. authority-bearing documents are listed and classified
2. reference-only documents are listed and classified separately
3. mixed review candidates are named explicitly rather than assumed retired
4. the retirement gate requires replacement authority to exist first
5. the plan remains planning-only and non-destructive

## Use Rules

1. Use this document only to plan later retirement work.
2. Do not execute any relabeling or retirement from this file alone.
3. If a document's role is ambiguous, classify it as `MIXED_REVIEW_REQUIRED` instead of assuming retirement.
4. If a document is historical, advisory, or archived, prefer preservation over removal.
5. If a document still governs a live technical domain independent of product-truth sequencing, do not retire it without a narrower review.