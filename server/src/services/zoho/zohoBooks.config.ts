import { z } from 'zod';

const envSchema = z.object({
  ZOHO_BOOKS_INTEGRATION_ENABLED: z.string().optional(),
  /** @deprecated Use ZOHO_BOOKS_INTEGRATION_ENABLED. Retained for backward-compat during rollout. */
  ZOHO_POST_ACTIVATION_SYNC_DRY_RUN_ENABLED: z.string().optional(),
  ZOHO_BOOKS_CLIENT_ID: z.string().trim().optional(),
  ZOHO_BOOKS_CLIENT_SECRET: z.string().trim().optional(),
  ZOHO_BOOKS_REFRESH_TOKEN: z.string().trim().optional(),
  ZOHO_BOOKS_ORGANIZATION_ID: z.string().trim().optional(),
  ZOHO_BOOKS_API_DOMAIN: z.string().trim().optional(),
});

export type ZohoBooksRuntimeConfig = {
  dryRunEnabled: boolean;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  organizationId: string;
  apiDomain: string;
};

export type ZohoBooksConfigReadResult =
  | { status: 'DISABLED'; dryRunEnabled: false }
  | { status: 'MISSING_REQUIRED_ENV'; dryRunEnabled: true; missingKeys: string[]; deprecatedFlagUsed?: boolean }
  | { status: 'READY'; dryRunEnabled: true; config: ZohoBooksRuntimeConfig; deprecatedFlagUsed?: boolean };

export function readZohoBooksRuntimeConfig(env: NodeJS.ProcessEnv = process.env): ZohoBooksConfigReadResult {
  const parsed = envSchema.parse(env);
  const integrationEnabled = parsed.ZOHO_BOOKS_INTEGRATION_ENABLED === 'true';
  const deprecatedFlagEnabled = parsed.ZOHO_POST_ACTIVATION_SYNC_DRY_RUN_ENABLED === 'true';
  const dryRunEnabled = integrationEnabled || deprecatedFlagEnabled;
  const deprecatedFlagUsed = !integrationEnabled && deprecatedFlagEnabled;

  if (!dryRunEnabled) {
    return { status: 'DISABLED', dryRunEnabled: false };
  }

  const requiredEntries = {
    ZOHO_BOOKS_CLIENT_ID: parsed.ZOHO_BOOKS_CLIENT_ID,
    ZOHO_BOOKS_CLIENT_SECRET: parsed.ZOHO_BOOKS_CLIENT_SECRET,
    ZOHO_BOOKS_REFRESH_TOKEN: parsed.ZOHO_BOOKS_REFRESH_TOKEN,
    ZOHO_BOOKS_ORGANIZATION_ID: parsed.ZOHO_BOOKS_ORGANIZATION_ID,
    ZOHO_BOOKS_API_DOMAIN: parsed.ZOHO_BOOKS_API_DOMAIN,
  } as const;

  const missingKeys = Object.entries(requiredEntries)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    return {
      status: 'MISSING_REQUIRED_ENV',
      dryRunEnabled: true,
      missingKeys,
      ...(deprecatedFlagUsed ? { deprecatedFlagUsed: true } : {}),
    };
  }

  return {
    status: 'READY',
    dryRunEnabled: true,
    ...(deprecatedFlagUsed ? { deprecatedFlagUsed: true } : {}),
    config: {
      dryRunEnabled: true,
      clientId: parsed.ZOHO_BOOKS_CLIENT_ID!,
      clientSecret: parsed.ZOHO_BOOKS_CLIENT_SECRET!,
      refreshToken: parsed.ZOHO_BOOKS_REFRESH_TOKEN!,
      organizationId: parsed.ZOHO_BOOKS_ORGANIZATION_ID!,
      apiDomain: parsed.ZOHO_BOOKS_API_DOMAIN!,
    },
  };
}