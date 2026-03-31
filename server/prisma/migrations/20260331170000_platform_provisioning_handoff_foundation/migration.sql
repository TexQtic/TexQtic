ALTER TABLE public.tenants
  ADD COLUMN external_orchestration_ref varchar(255);

CREATE UNIQUE INDEX tenants_external_orchestration_ref_key
  ON public.tenants (external_orchestration_ref);

ALTER TABLE public.organizations
  ADD COLUMN external_orchestration_ref varchar(255);

CREATE UNIQUE INDEX organizations_external_orchestration_ref_key
  ON public.organizations (external_orchestration_ref);

ALTER TABLE public.invites
  ADD COLUMN external_orchestration_ref varchar(255),
  ADD COLUMN invite_purpose varchar(50) NOT NULL DEFAULT 'TEAM_MEMBER';

CREATE INDEX idx_invites_external_orchestration_ref
  ON public.invites (external_orchestration_ref);

CREATE INDEX idx_invites_invite_purpose
  ON public.invites (invite_purpose);