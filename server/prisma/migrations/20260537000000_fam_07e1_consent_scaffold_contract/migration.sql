-- FAM-07E1-CONSENT-SCAFFOLD-BACKEND-SCHEMA-CONTRACT-001
-- Scaffold only: schema/contract foundation for legal consent snapshot + immutable event history.
-- No legal-final wording, no final enforcement wiring, no activation gate behavior changes.
DO $fam07e1_types$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_type
  WHERE typname = 'legal_consent_status'
) THEN CREATE TYPE public.legal_consent_status AS ENUM (
  'LEGAL_PENDING',
  'LEGAL_APPROVED',
  'SUPERSEDED'
);
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_type
  WHERE typname = 'legal_consent_source_flow'
) THEN CREATE TYPE public.legal_consent_source_flow AS ENUM (
  'ACTIVATE_NEW_USER',
  'ACTIVATE_AUTHENTICATED_INVITE',
  'ADMIN_REVIEW'
);
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_type
  WHERE typname = 'legal_consent_agreement_type'
) THEN CREATE TYPE public.legal_consent_agreement_type AS ENUM (
  'PLATFORM_TERMS',
  'SUPPLIER_ONBOARDING_TERMS',
  'PRIVACY_NOTICE_ACK'
);
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_type
  WHERE typname = 'legal_consent_event_type'
) THEN CREATE TYPE public.legal_consent_event_type AS ENUM (
  'CHECKPOINT_PRESENTED',
  'ACCEPTED_PENDING',
  'ACCEPTED_FINAL',
  'SUPERSEDED',
  'RECONSENT_REQUIRED',
  'RECONSENT_COMPLETED',
  'GATE_REJECTED'
);
END IF;
END $fam07e1_types$;
CREATE TABLE IF NOT EXISTS public.legal_consent_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id uuid NULL REFERENCES public.tenants(id) ON DELETE
  SET NULL,
    actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    agreement_type public.legal_consent_agreement_type NOT NULL,
    agreement_version varchar(120) NOT NULL,
    agreement_hash varchar(256) NOT NULL,
    agreement_source_url varchar(1024) NOT NULL,
    legal_status public.legal_consent_status NOT NULL DEFAULT 'LEGAL_PENDING',
    source_flow public.legal_consent_source_flow NOT NULL,
    accepted_at timestamptz NULL,
    reviewed_at timestamptz NULL,
    correlation_id uuid NULL,
    request_id varchar(100) NULL,
    metadata_json jsonb NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT legal_consent_snapshot_identity_unique UNIQUE (org_id, actor_user_id, agreement_type)
);
CREATE INDEX IF NOT EXISTS idx_legal_consent_snapshots_tenant_id ON public.legal_consent_snapshots (tenant_id);
CREATE INDEX IF NOT EXISTS idx_legal_consent_snapshots_legal_status ON public.legal_consent_snapshots (legal_status);
CREATE INDEX IF NOT EXISTS idx_legal_consent_snapshots_source_flow ON public.legal_consent_snapshots (source_flow);
CREATE INDEX IF NOT EXISTS idx_legal_consent_snapshots_updated_at ON public.legal_consent_snapshots (updated_at DESC);
CREATE TABLE IF NOT EXISTS public.legal_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NULL REFERENCES public.legal_consent_snapshots(id) ON DELETE
  SET NULL,
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    tenant_id uuid NULL REFERENCES public.tenants(id) ON DELETE
  SET NULL,
    actor_user_id uuid NULL REFERENCES public.users(id) ON DELETE
  SET NULL,
    agreement_type public.legal_consent_agreement_type NOT NULL,
    agreement_version varchar(120) NOT NULL,
    agreement_hash varchar(256) NOT NULL,
    agreement_source_url varchar(1024) NOT NULL,
    legal_status public.legal_consent_status NOT NULL,
    source_flow public.legal_consent_source_flow NOT NULL,
    event_type public.legal_consent_event_type NOT NULL,
    accepted_at timestamptz NULL,
    reviewed_at timestamptz NULL,
    correlation_id uuid NULL,
    request_id varchar(100) NULL,
    metadata_json jsonb NULL,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_legal_consent_events_snapshot_id ON public.legal_consent_events (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_legal_consent_events_org_occurred_at ON public.legal_consent_events (org_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_consent_events_tenant_occurred_at ON public.legal_consent_events (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_consent_events_actor_user_id ON public.legal_consent_events (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_legal_consent_events_agreement_type ON public.legal_consent_events (agreement_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_consent_events_event_type ON public.legal_consent_events (event_type, occurred_at DESC);