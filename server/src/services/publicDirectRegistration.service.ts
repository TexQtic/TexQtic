import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { writeAuditLog } from '../lib/auditLog.js';
import {
  notifyRegistrationSubmitted,
  type CrmAttributionPayload,
} from './crmLifecycleNotifyClient.js';

export type DirectRegistrationRoleIntent = 'supplier' | 'buyer' | 'service_provider';

export interface DirectRegistrationAttribution {
  sourceChannel?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  campaignId?: string;
  referralCode?: string;
  acquisitionContext?: string;
  landingPage?: string;
  referrerUrl?: string;
  firstTouchTimestamp?: string;
}

export interface DirectRegistrationPayload {
  roleIntent: DirectRegistrationRoleIntent;
  name: string;
  email: string;
  password: string;
  companyName: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  attribution?: DirectRegistrationAttribution;
}

export interface DirectRegistrationResult {
  success: true;
  provisional: true;
  roleIntent: DirectRegistrationRoleIntent;
  tenantId: string;
  tenantSlug: string;
  organizationStatus: 'PENDING_VERIFICATION';
  membershipRole: 'OWNER';
  nextStep: 'SIGN_IN_TO_CONTINUE_ONBOARDING';
}

export interface PersistedDirectRegistrationRoleIntent {
  roleIntent: DirectRegistrationRoleIntent;
  source: 'audit_log.public.direct_registration.created';
}

const DIRECT_ROLE_INTENTS: ReadonlySet<DirectRegistrationRoleIntent> = new Set([
  'supplier',
  'buyer',
  'service_provider',
]);

function parsePersistedRoleIntent(metadataJson: Prisma.JsonValue | null): DirectRegistrationRoleIntent | null {
  if (!metadataJson || typeof metadataJson !== 'object' || Array.isArray(metadataJson)) {
    return null;
  }

  const roleIntent = (metadataJson as Record<string, unknown>).roleIntent;
  if (typeof roleIntent !== 'string') {
    return null;
  }

  if (!DIRECT_ROLE_INTENTS.has(roleIntent as DirectRegistrationRoleIntent)) {
    return null;
  }

  return roleIntent as DirectRegistrationRoleIntent;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);

  return slug || `org-${randomUUID().slice(0, 8)}`;
}

async function generateUniqueSlug(tx: Prisma.TransactionClient, companyName: string): Promise<string> {
  const base = slugify(companyName);

  const [orgSlugs, tenantSlugs] = await Promise.all([
    tx.organizations.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
      take: 200,
    }),
    tx.tenant.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
      take: 200,
    }),
  ]);

  const taken = new Set([...orgSlugs.map(row => row.slug), ...tenantSlugs.map(row => row.slug)]);

  if (!taken.has(base)) {
    return base;
  }

  for (let i = 2; i <= 1000; i += 1) {
    const suffix = `-${i}`;
    const candidate = `${base.slice(0, Math.max(1, 100 - suffix.length))}${suffix}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  return `${base.slice(0, 84)}-${randomUUID().slice(0, 8)}`;
}

export async function registerDirectProvisionalAccount(
  payload: DirectRegistrationPayload,
): Promise<DirectRegistrationResult> {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedName = payload.name.trim();
  const normalizedCompanyName = payload.companyName.trim();

  // Hash password before the transaction to avoid holding a DB connection during
  // CPU-intensive work. bcrypt with 12 rounds takes ~300ms and must not run inside
  // a Prisma interactive transaction.
  const passwordHash = await bcrypt.hash(payload.password, 12);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result: DirectRegistrationResult = await prisma.$transaction(async tx => {
        const existingUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });

        if (existingUser) {
          throw Object.assign(new Error('Email already exists'), { code: 'DUPLICATE_EMAIL' });
        }

        const slug = await generateUniqueSlug(tx, normalizedCompanyName);

        const user = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            emailVerified: false,
          },
          select: { id: true },
        });

        const tenant = await tx.tenant.create({
          data: {
            name: normalizedCompanyName,
            slug,
            type: 'B2B',
            status: 'ACTIVE',
            plan: 'FREE',
          },
          select: {
            id: true,
            slug: true,
          },
        });

        // Trigger trg_sync_tenants_to_org (G-015) fires AFTER INSERT on tenants
        // and pre-creates the organizations row with status='ACTIVE'. Update only
        // the fields that differ from the trigger defaults for provisional registration.
        await tx.organizations.update({
          where: { id: tenant.id },
          data: {
            legal_name: normalizedCompanyName,
            jurisdiction: payload.country?.trim() || 'UNKNOWN',
            org_type: 'B2B',
            status: 'PENDING_VERIFICATION',
            plan: 'FREE',
          },
        });

        // Set admin RLS context before inserting membership and audit log.
        // memberships has an RLS policy (memberships_tenant_access FOR ALL) that
        // requires either app.org_id = tenant_id OR app.is_admin = 'true'.
        // This is a system-level provisioning operation; no tenant session exists
        // yet for this brand-new org, so admin context is the correct choice.
        await tx.$executeRawUnsafe(`SELECT set_config('app.org_id', '', true)`);
        await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);

        await tx.membership.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            role: 'OWNER',
          },
          select: { id: true },
        });

        await writeAuditLog(tx, {
          realm: 'TENANT',
          tenantId: tenant.id,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'public.direct_registration.created',
          entity: 'organization',
          entityId: tenant.id,
          metadataJson: {
            registrationLane: 'DIRECT_SELF_SERVE',
            roleIntent: payload.roleIntent,
            profile: {
              name: normalizedName,
              companyName: normalizedCompanyName,
              phone: payload.phone?.trim() || null,
              city: payload.city?.trim() || null,
              state: payload.state?.trim() || null,
              country: payload.country?.trim() || null,
            },
            attribution: payload.attribution ?? null,
          } as Prisma.JsonValue,
        });

        return {
          success: true,
          provisional: true,
          roleIntent: payload.roleIntent,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          organizationStatus: 'PENDING_VERIFICATION',
          membershipRole: 'OWNER',
          nextStep: 'SIGN_IN_TO_CONTINUE_ONBOARDING',
        };
      });
      // Fire-and-forget CRM lifecycle event — must not block or throw into registration.
      // Email is included only in this event (EMAIL_INCLUDED_IN_V1).
      // externalOrchestrationRef is always null for direct-registration orgs.
      const crmAttribution: CrmAttributionPayload | null = payload.attribution
        ? {
            source_channel: payload.attribution.sourceChannel ?? null,
            utm_source: payload.attribution.utmSource ?? null,
            utm_medium: payload.attribution.utmMedium ?? null,
            utm_campaign: payload.attribution.utmCampaign ?? null,
          }
        : null;

      void notifyRegistrationSubmitted({
        orgId: result.tenantId,
        tenantId: result.tenantId,
        email: normalizedEmail,
        legalName: normalizedCompanyName,
        roleIntent: payload.roleIntent,
        jurisdiction: payload.country?.trim() || 'UNKNOWN',
        plan: 'FREE',
        orgStatus: 'PENDING_VERIFICATION',
        externalOrchestrationRef: null,
        attribution: crmAttribution,
      }).catch(() => undefined);

      return result;    } catch (error: unknown) {
      const code = (error as { code?: string }).code;

      if (code === 'DUPLICATE_EMAIL') {
        throw error;
      }

      // Retry once for concurrent slug collisions.
      if (code === 'P2002' && attempt < 2) {
        continue;
      }

      throw error;
    }
  }

  throw new Error('Unable to create account');
}

export async function getPersistedDirectRegistrationRoleIntentByTenantId(
  tenantId: string,
): Promise<PersistedDirectRegistrationRoleIntent | null> {
  const registrationAudit = await prisma.auditLog.findFirst({
    where: {
      realm: 'TENANT',
      tenantId,
      action: 'public.direct_registration.created',
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      metadataJson: true,
    },
  });

  const roleIntent = parsePersistedRoleIntent(registrationAudit?.metadataJson ?? null);
  if (!roleIntent) {
    return null;
  }

  return {
    roleIntent,
    source: 'audit_log.public.direct_registration.created',
  };
}
