-- B2B Public Projection Preconditions
-- Slice: PUBLIC_B2B_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE
-- Design authority: governance/decisions/TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1.md
-- Layer 0 opening: governance/control/NEXT-ACTION.md (2026-04-22)
BEGIN;
-- ── (A) TenantPublicEligibilityPosture enum ──────────────────────────────────
-- Maps to Prisma enum TenantPublicEligibilityPosture / @@map("tenant_public_eligibility_posture")
-- Gate A: tenant-level gate evaluated before any object-level posture check.
-- Default: NO_PUBLIC_PRESENCE — zero public exposure for all existing tenants.
CREATE TYPE "tenant_public_eligibility_posture" AS ENUM (
  'NO_PUBLIC_PRESENCE',
  'LIMITED_PUBLIC_PRESENCE',
  'PUBLICATION_ELIGIBLE'
);
-- ── (B) tenants.public_eligibility_posture ───────────────────────────────────
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS public_eligibility_posture "tenant_public_eligibility_posture" NOT NULL DEFAULT 'NO_PUBLIC_PRESENCE';
-- ── (C) organizations.publication_posture ────────────────────────────────────
-- Gate B: object-level gate for org supplier presence on B2B public discovery.
-- Vocabulary is enforced by CHECK constraint — same invariant as org_status.
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS publication_posture VARCHAR(30) NOT NULL DEFAULT 'PRIVATE_OR_AUTH_ONLY';
ALTER TABLE public.organizations
ADD CONSTRAINT organizations_publication_posture_check CHECK (
    publication_posture IN (
      'PRIVATE_OR_AUTH_ONLY',
      'B2B_PUBLIC',
      'B2C_PUBLIC',
      'BOTH'
    )
  );
-- ── (D) catalog_items.publication_posture ────────────────────────────────────
-- Gate B extension: object-level gate for individual offering previews.
-- Items default to PRIVATE_OR_AUTH_ONLY — must be explicitly opted in to B2B_PUBLIC.
ALTER TABLE public.catalog_items
ADD COLUMN IF NOT EXISTS publication_posture VARCHAR(30) NOT NULL DEFAULT 'PRIVATE_OR_AUTH_ONLY';
ALTER TABLE public.catalog_items
ADD CONSTRAINT catalog_items_publication_posture_check CHECK (
    publication_posture IN (
      'PRIVATE_OR_AUTH_ONLY',
      'B2B_PUBLIC',
      'B2C_PUBLIC',
      'BOTH'
    )
  );
COMMIT;