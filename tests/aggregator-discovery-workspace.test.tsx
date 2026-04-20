import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AggregatorDiscoveryWorkspace } from '../components/Tenant/AggregatorDiscoveryWorkspace';
import type { AggregatorDiscoveryEntry } from '../services/aggregatorDiscoveryService';

function makeDiscoveryEntry(overrides: Partial<AggregatorDiscoveryEntry> = {}): AggregatorDiscoveryEntry {
  return {
    orgId: '11111111-1111-1111-1111-111111111111',
    slug: 'atlas-industrial',
    legalName: 'Atlas Industrial Components',
    orgType: 'B2B',
    jurisdiction: 'DE',
    certificationCount: 2,
    certificationTypes: ['ISO9001', 'OEKO-TEX'],
    hasTraceabilityEvidence: true,
    visibilityIndicators: ['PUBLIC', 'TENANT'],
    ...overrides,
  };
}

function renderHtml(
  entries: AggregatorDiscoveryEntry[],
  options?: { loading?: boolean; error?: string | null; aiInsight?: string | null }
) {
  return renderToStaticMarkup(
    <AggregatorDiscoveryWorkspace
      tenantName="TexQtic Aggregator"
      entries={entries}
      loading={options?.loading ?? false}
      error={options?.error ?? null}
      aiInsight={options?.aiInsight ?? 'Industrial sourcing demand is tightening across compliant EU suppliers.'}
      onRetry={() => undefined}
    />
  );
}

describe('AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS — workspace surface', () => {
  it('renders curated counterparties with bounded trust cues', () => {
    const html = renderHtml([
      makeDiscoveryEntry(),
      makeDiscoveryEntry({
        orgId: '22222222-2222-2222-2222-222222222222',
        slug: 'nordic-fibers',
        legalName: 'Nordic Fibers Group',
        certificationCount: 1,
        certificationTypes: ['GOTS'],
        visibilityIndicators: ['TENANT'],
      }),
    ]);

    expect(html).toContain('Bounded discovery capability surface');
    expect(html).not.toContain('Aggregator-owned discovery workspace');
    expect(html).toContain('Curated company discovery');
    expect(html).toContain('Atlas Industrial Components');
    expect(html).toContain('Nordic Fibers Group');
    expect(html).toContain('Traceability evidence');
    expect(html).toContain('2 certifications');
    expect(html).toContain('AI Market Analysis');
    expect(html).toContain('Read-only discovery record');
  });

  it('renders a stable empty state when no curated companies are available', () => {
    const html = renderHtml([], { aiInsight: null });

    expect(html).toContain('No curated companies are available yet.');
    expect(html).toContain('The discovery surface is now wired for real records');
  });

  it('renders a bounded error state when discovery records fail to load', () => {
    const html = renderHtml([], {
      error: 'Failed to load curated discovery records. Please try again.',
      aiInsight: null,
    });

    expect(html).toContain('Failed to load curated discovery records. Please try again.');
    expect(html).toContain('Retry');
  });

  it('does not render forbidden detail or transactional actions', () => {
    const html = renderHtml([
      makeDiscoveryEntry({
        discoverySafeTaxonomy: {
          primarySegment: 'Weaving',
          secondarySegments: ['Fabric Processing'],
          rolePositions: ['manufacturer'],
        },
      }),
    ]);

    expect(html).not.toContain('View Detail');
    expect(html).not.toContain('Create RFQ');
    expect(html).not.toContain('Start Negotiation');
    expect(html).not.toContain('Settlement');
    expect(html).not.toContain('Weaving');
    expect(html).not.toContain('Fabric Processing');
    expect(html).not.toContain('manufacturer');
  });
});