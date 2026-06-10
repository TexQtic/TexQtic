import { readZohoBooksRuntimeConfig } from './zohoBooks.config.js';
import {
  buildZohoBooksBaseUrl,
  fetchZohoBooksOrganizations,
  fetchZohoBooksCustomFields,
  fetchZohoBooksSandboxes,
  refreshZohoBooksAccessToken,
} from './zohoBooks.client.js';
import { buildZohoBooksContactPayload, buildZohoBooksIdempotencyHeaders } from './zohoBooks.payload.js';

export type ZohoBooksDryRunSnapshot = {
  organization: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    jurisdiction: string;
    status: string;
  };
  tenant: {
    id: string;
    name: string;
    plan: string;
  };
  activatedAt: string;
  source?: string;
};

export type ZohoBooksIntegrationDraft = {
  organizationId: string;
  providerKey: 'zoho_books';
  externalObjectType: 'contact';
  externalId: null;
  syncStatus: 'DRY_RUN_READY' | 'DRY_RUN_PARTIAL';
  lastAttemptedAt: string | null;
  lastDryRunAt: string | null;
  lastErrorSummary: string | null;
  metadataJson: Record<string, unknown>;
};

export type ZohoBooksDryRunResult =
  | {
      status: 'DISABLED';
      liveMutationAttempted: false;
      liveMutationBlocked: true;
      configState: 'DISABLED';
      payload: null;
      integrationDraft: null;
      remoteChecks: null;
    }
  | {
      status: 'MISSING_REQUIRED_ENV';
      liveMutationAttempted: false;
      liveMutationBlocked: true;
      configState: 'MISSING_REQUIRED_ENV';
      missingKeys: string[];
      payload: null;
      integrationDraft: null;
      remoteChecks: null;
    }
  | {
      status: 'INELIGIBLE_STATUS';
      liveMutationAttempted: false;
      liveMutationBlocked: true;
      configState: 'READY';
      payload: null;
      integrationDraft: null;
      remoteChecks: null;
    }
  | {
      status: 'DRY_RUN_READY' | 'DRY_RUN_PARTIAL';
      liveMutationAttempted: false;
      liveMutationBlocked: true;
      configState: 'READY';
      payload: ReturnType<typeof buildZohoBooksContactPayload>;
      integrationDraft: ZohoBooksIntegrationDraft;
      remoteChecks: {
        accessToken: 'OK' | 'FAILED';
        organizations: 'OK' | 'FAILED';
        customFields: 'OK' | 'FAILED';
        sandbox: 'YES' | 'NO' | 'UNKNOWN';
        apiBaseUrl: string;
        idempotencyHeaders: Record<string, string>;
      };
    };

export async function runZohoBooksPostActivationDryRun(
  snapshot: ZohoBooksDryRunSnapshot,
): Promise<ZohoBooksDryRunResult> {
  const configResult = readZohoBooksRuntimeConfig();

  if (configResult.status === 'DISABLED') {
    return {
      status: 'DISABLED',
      liveMutationAttempted: false,
      liveMutationBlocked: true,
      configState: 'DISABLED',
      payload: null,
      integrationDraft: null,
      remoteChecks: null,
    };
  }

  if (configResult.status === 'MISSING_REQUIRED_ENV') {
    return {
      status: 'MISSING_REQUIRED_ENV',
      liveMutationAttempted: false,
      liveMutationBlocked: true,
      configState: 'MISSING_REQUIRED_ENV',
      missingKeys: configResult.missingKeys,
      payload: null,
      integrationDraft: null,
      remoteChecks: null,
    };
  }

  if (snapshot.organization.status !== 'VERIFICATION_APPROVED') {
    return {
      status: 'INELIGIBLE_STATUS',
      liveMutationAttempted: false,
      liveMutationBlocked: true,
      configState: 'READY',
      payload: null,
      integrationDraft: null,
      remoteChecks: null,
    };
  }

  const payload = buildZohoBooksContactPayload(snapshot);
  const apiBaseUrl = buildZohoBooksBaseUrl(configResult.config.apiDomain);
  const idempotencyHeaders = buildZohoBooksIdempotencyHeaders(snapshot.organization.id);

  const tokenResult = await refreshZohoBooksAccessToken(configResult.config);
  const organizationsResult: Awaited<ReturnType<typeof fetchZohoBooksOrganizations>> =
    tokenResult.status === 'OK'
      ? await fetchZohoBooksOrganizations(apiBaseUrl, tokenResult.accessToken)
      : { status: 'FAILED', errorSummary: tokenResult.errorSummary };
  const fieldsResult: Awaited<ReturnType<typeof fetchZohoBooksCustomFields>> =
    tokenResult.status === 'OK'
      ? await fetchZohoBooksCustomFields(apiBaseUrl, tokenResult.accessToken, configResult.config.organizationId)
      : { status: 'FAILED', errorSummary: tokenResult.errorSummary };
  const sandboxesResult: Awaited<ReturnType<typeof fetchZohoBooksSandboxes>> =
    tokenResult.status === 'OK'
      ? await fetchZohoBooksSandboxes(apiBaseUrl, tokenResult.accessToken, configResult.config.organizationId)
      : { status: 'OK', sandboxAvailable: 'UNKNOWN' as const };

  const integrationDraft: ZohoBooksIntegrationDraft = {
    organizationId: snapshot.organization.id,
    providerKey: 'zoho_books',
    externalObjectType: 'contact',
    externalId: null,
    syncStatus:
      tokenResult.status === 'OK' && organizationsResult.status === 'OK' && fieldsResult.status === 'OK'
        ? 'DRY_RUN_READY'
        : 'DRY_RUN_PARTIAL',
    lastAttemptedAt: snapshot.activatedAt,
    lastDryRunAt: snapshot.activatedAt,
    lastErrorSummary:
      tokenResult.status === 'FAILED'
        ? tokenResult.errorSummary
        : organizationsResult.status === 'FAILED'
          ? organizationsResult.errorSummary
          : fieldsResult.status === 'FAILED'
            ? fieldsResult.errorSummary
            : null,
    metadataJson: {
      source: snapshot.source?.trim() || 'TexQtic Main App',
      activationSnapshot: snapshot,
      readOnlyChecks: {
        tokenRefresh: { status: tokenResult.status },
        organizations: organizationsResult,
        customFields: fieldsResult,
        sandboxes: sandboxesResult,
      },
      idempotencyHeaders,
      payload,
    },
  };

  return {
    status: integrationDraft.syncStatus,
    liveMutationAttempted: false,
    liveMutationBlocked: true,
    configState: 'READY',
    payload,
    integrationDraft,
    remoteChecks: {
      accessToken: tokenResult.status,
      organizations: organizationsResult.status,
      customFields: fieldsResult.status,
      sandbox: sandboxesResult.status === 'OK' ? sandboxesResult.sandboxAvailable : 'UNKNOWN',
      apiBaseUrl,
      idempotencyHeaders,
    },
  };
}