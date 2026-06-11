import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { B2BDiscoveryPage } from '../../components/Public/B2BDiscovery';
import type { PublicNavbarProps } from '../../components/Public/PublicNavbar';
import { getPublicB2BSuppliers, type PublicB2BSuppliersResponse } from '../../services/publicB2BService';

vi.mock('../../components/Public/PublicNavbar', () => ({
  PublicNavbar: () => <nav aria-label="Public navigation" />,
}));

vi.mock('../../services/publicB2BService', async () => {
  const actual = await vi.importActual<typeof import('../../services/publicB2BService')>('../../services/publicB2BService');
  return {
    ...actual,
    getPublicB2BSuppliers: vi.fn(),
  };
});

const DIRECTORY_RESPONSE: PublicB2BSuppliersResponse = {
  total: 2,
  page: 1,
  limit: 20,
  items: [
    {
      slug: 'shraddha-industries',
      legalName: 'Shraddha Industries',
      orgType: 'B2B',
      jurisdiction: 'Surat, Gujarat',
      certificationCount: 0,
      certificationTypes: [],
      hasTraceabilityEvidence: false,
      taxonomy: {
        primarySegment: 'textile_processing',
        secondarySegments: [],
        rolePositions: ['manufacturer'],
      },
      offeringPreview: [],
      publicationPosture: 'B2B_PUBLIC',
      eligibilityPosture: 'PUBLICATION_ELIGIBLE',
    },
    {
      slug: 'lt-b2b-001',
      legalName: 'Launch Test Supplier B2B 001',
      orgType: 'B2B',
      jurisdiction: 'IN',
      certificationCount: 0,
      certificationTypes: [],
      hasTraceabilityEvidence: false,
      taxonomy: {
        primarySegment: 'Weaving',
        secondarySegments: [],
        rolePositions: [],
      },
      offeringPreview: [
        { name: 'LT Fabric Sample 001', moq: 100, imageUrl: null },
      ],
      publicationPosture: 'B2B_PUBLIC',
      eligibilityPosture: 'PUBLICATION_ELIGIBLE',
    },
  ],
};

function renderDirectory(): void {
  const nav: PublicNavbarProps = {
    activeSection: 'b2b',
    onGoHome: () => {},
    onGoB2B: () => {},
    onGoProducts: () => {},
    onGoCollections: () => {},
    onGoIndustry: () => {},
    onGoTrust: () => {},
    onGoAggregator: () => {},
    onGoInquiry: () => {},
    onGoPricing: () => {},
    onSignIn: () => {},
    onJoinTexQtic: () => {},
  };

  render(
    <B2BDiscoveryPage
      onBack={() => {}}
      onSignIn={() => {}}
      onListBusiness={() => {}}
      onViewProfile={() => {}}
      nav={nav}
    />,
  );
}

describe('B2BDiscoveryPage public directory regression guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('keeps a slow pending request in a neutral loading state at the timeout threshold', async () => {
    vi.mocked(getPublicB2BSuppliers).mockReturnValue(new Promise(() => {}));

    renderDirectory();

    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(screen.queryByText(/We could not load public profiles right now/i)).toBeNull();
    expect(screen.getByText(/Still loading public textile profiles/i)).toBeInTheDocument();
    expect(screen.queryByText('Shraddha Industries')).toBeNull();
    expect(screen.queryByText('Launch Test Supplier B2B 001')).toBeNull();
  });

  it('renders public supplier cards when a delayed successful response arrives after the timeout threshold', async () => {
    let resolveSuppliers: (value: PublicB2BSuppliersResponse) => void = () => {};
    vi.mocked(getPublicB2BSuppliers).mockReturnValue(
      new Promise((resolve) => {
        resolveSuppliers = resolve;
      }),
    );

    renderDirectory();

    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(screen.queryByText(/We could not load public profiles right now/i)).toBeNull();
    expect(screen.getByText(/Still loading public textile profiles/i)).toBeInTheDocument();

    await act(async () => {
      resolveSuppliers(DIRECTORY_RESPONSE);
      await Promise.resolve();
    });

    expect(screen.queryByText(/We could not load public profiles right now/i)).toBeNull();
    expect(screen.getByText('Shraddha Industries')).toBeInTheDocument();
    expect(screen.getByText('Launch Test Supplier B2B 001')).toBeInTheDocument();
    expect(screen.getByText('Demo / pilot supplier')).toBeInTheDocument();
  });

  it('renders the public error panel only after a genuine failed request', async () => {
    vi.mocked(getPublicB2BSuppliers).mockRejectedValue(new Error('directory unavailable'));

    renderDirectory();

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/We could not load public profiles right now/i)).toBeInTheDocument();
    expect(screen.queryByText('Shraddha Industries')).toBeNull();
    expect(screen.queryByText('Launch Test Supplier B2B 001')).toBeNull();
    expect(screen.queryByText('Demo / pilot supplier')).toBeNull();
  });
});
