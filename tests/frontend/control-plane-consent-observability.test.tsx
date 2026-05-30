/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';

import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TenantDetails } from '../../components/ControlPlane/TenantDetails';
import { TenantStatus, TenantType, type TenantConfig } from '../../types';
import { getTenantById } from '../../services/controlPlaneService';

vi.mock('../../services/controlPlaneService', async importOriginal => {
  const actual = await importOriginal<typeof import('../../services/controlPlaneService')>();
  return {
    ...actual,
    getTenantById: vi.fn(),
    activateApprovedOnboarding: vi.fn(),
    archiveTenant: vi.fn(),
    recordOnboardingOutcome: vi.fn(),
  };
});

const mockedGetTenantById = vi.mocked(getTenantById);

const baseTenant: TenantConfig = {
  id: '22222222-2222-2222-2222-222222222222',
  slug: 'qa-wl',
  name: 'QA WL',
  type: TenantType.B2C,
  tenant_category: 'B2C',
  is_white_label: true,
  status: TenantStatus.ACTIVE,
  onboarding_status: 'ACTIVE',
  plan: 'ENTERPRISE',
  theme: {
    primaryColor: '#111827',
    secondaryColor: '#1f2937',
    logo: 'Q',
  },
  features: [],
  aiBudget: 1000,
  aiUsage: 50,
  billingStatus: 'CURRENT',
  riskScore: 0,
};

describe('FAM-07E4 control-plane consent scaffold observability', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('CP-CONSENT-001 renders safe empty state when no scaffold records exist', async () => {
    mockedGetTenantById.mockResolvedValue({
      tenant: {
        ...baseTenant,
        memberships: [],
        consent_scaffold_observability: {
          has_records: false,
          has_legal_approved_record: false,
          latest_snapshot: null,
          recent_events: [],
        },
      },
    } as any);

    render(
      <TenantDetails
        tenant={baseTenant}
        onBack={vi.fn()}
        onImpersonate={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/consent scaffold observability/i)).toBeInTheDocument();
      expect(screen.getByText(/not legal-approved/i)).toBeInTheDocument();
      expect(screen.getByText(/no consent scaffold records are available for this tenant yet/i)).toBeInTheDocument();
    });
  });

  it('CP-CONSENT-002 surfaces LEGAL_PENDING scaffold status with bounded event fields', async () => {
    mockedGetTenantById.mockResolvedValue({
      tenant: {
        ...baseTenant,
        memberships: [],
        consent_scaffold_observability: {
          has_records: true,
          has_legal_approved_record: false,
          latest_snapshot: {
            id: 'snapshot-1',
            actorUserId: '33333333-3333-3333-3333-333333333333',
            agreementType: 'TERMS_OF_USE',
            agreementVersion: 'scaffold-v1',
            legalStatus: 'LEGAL_PENDING',
            sourceFlow: 'ACTIVATE_NEW_USER',
            acceptedAt: null,
            reviewedAt: null,
            updatedAt: '2026-05-30T10:00:00.000Z',
          },
          recent_events: [
            {
              id: 'event-1',
              actorUserId: '33333333-3333-3333-3333-333333333333',
              agreementType: 'TERMS_OF_USE',
              agreementVersion: 'scaffold-v1',
              legalStatus: 'LEGAL_PENDING',
              sourceFlow: 'ACTIVATE_NEW_USER',
              eventType: 'CAPTURED',
              acceptedAt: null,
              reviewedAt: null,
              occurredAt: '2026-05-30T10:00:00.000Z',
            },
          ],
        },
      },
    } as any);

    render(
      <TenantDetails
        tenant={baseTenant}
        onBack={vi.fn()}
        onImpersonate={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/legal_pending/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/recent consent events/i)).toBeInTheDocument();
      expect(screen.getByText(/captured/i)).toBeInTheDocument();
      expect(screen.queryByText(/agreement_source_url/i)).not.toBeInTheDocument();
    });
  });
});
