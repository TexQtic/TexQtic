/**
 * Public reference CTA suppression — source-level and behavioural checks
 *
 * Unit:    MAINAPP-PUBLIC-READINESS-001E-D2-P1
 * Date:    2026-05-25
 *
 * Covers:
 *   RCS-001 — PublicCollectionDetail does not expose collection-specific inquiry CTA.
 *   RCS-002 — PublicB2CCategoryPage guards category-specific inquiry CTA behind !usingReferencePreview.
 *   RCS-003 — PublicSupplierProfile suppresses inquiry form when serving a reference profile (API 404).
 *   RCS-004 — Live inquiry path confirmed available (covered by PSI-001 in
 *             tests/frontend/public-supplier-profile-inquiry.test.tsx).
 *   RCS-005 — Public B2B discovery cards wire demo/pilot supplier labeling.
 *
 * Harness: vitest + @testing-library/react + jsdom (for RCS-003); Node.js fs (for RCS-001, RCS-002).
 */

import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PublicSupplierProfile } from '../../components/Public/PublicSupplierProfile';
import * as publicB2BService from '../../services/publicB2BService';

// ─── Path resolution ──────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(__filename, '..', '..', '..');

const COLLECTION_DETAIL_SRC = join(REPO_ROOT, 'components', 'Public', 'PublicCollectionDetail.tsx');
const CATEGORY_PAGE_SRC     = join(REPO_ROOT, 'components', 'Public', 'PublicB2CCategoryPage.tsx');
const SUPPLIER_PROFILE_SRC  = join(REPO_ROOT, 'components', 'Public', 'PublicSupplierProfile.tsx');
const B2B_DISCOVERY_SRC     = join(REPO_ROOT, 'components', 'Public', 'B2BDiscovery.tsx');

// ─── Module mock (for RCS-003) ────────────────────────────────────────────────

vi.mock('../../services/publicB2BService', () => ({
  DEMO_PILOT_SUPPLIER_HELPER_TEXT: 'Reference profile for launch testing; not a verified commercial supplier.',
  DEMO_PILOT_SUPPLIER_LABEL: 'Demo / pilot supplier',
  getPublicSupplierBySlug: vi.fn(),
  isDemoPilotSupplierSlug: (slug: string) => slug.trim().toLowerCase() === 'lt-b2b-001',
  submitPublicInquiry: vi.fn(),
}));

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// ─── Source-level checks ──────────────────────────────────────────────────────

describe('public reference CTA suppression — source checks', () => {
  /**
   * RCS-001 — PublicCollectionDetail must not render a collection-specific inquiry CTA.
   *
   * All collections in the current phase are static-config-backed sample previews.
   * The "/inquiry?collectionSlug=…" href was removed entirely from the component.
   */
  it('RCS-001 — PublicCollectionDetail has no collection-specific inquiry href', () => {
    const src = readFileSync(COLLECTION_DETAIL_SRC, 'utf-8');
    expect(src).not.toContain('/inquiry?collectionSlug=');
    expect(src).not.toContain('sourceSurface=COLLECTION_DETAIL');
  });

  /**
   * RCS-002 — PublicB2CCategoryPage wraps the category inquiry CTA behind !usingReferencePreview.
   *
   * The CTA must still exist in the source (for the live/non-reference path), but it
   * must be guarded so it is hidden when usingReferencePreview is true.
   */
  it('RCS-002 — PublicB2CCategoryPage category inquiry CTA is guarded by !usingReferencePreview', () => {
    const src = readFileSync(CATEGORY_PAGE_SRC, 'utf-8');

    // CTA still exists (live path preserved)
    expect(src).toContain('/inquiry?categorySlug=');
    expect(src).toContain('sourceSurface=CATEGORY_STORY');

    // Guard must wrap the CTA — !usingReferencePreview must appear before CATEGORY_STORY
    expect(src).toMatch(/!usingReferencePreview[\s\S]*?sourceSurface=CATEGORY_STORY/);
  });

  /**
   * RCS-003 (source) — PublicSupplierProfile guards inquiry form section behind !isReferencePreview.
   *
   * This confirms the guard is present in source before the render test verifies it at runtime.
   */
  it('RCS-003-source — PublicSupplierProfile inquiry section is guarded by !isReferencePreview', () => {
    const src = readFileSync(SUPPLIER_PROFILE_SRC, 'utf-8');

    // Inquiry form section exists in source (for live profiles)
    expect(src).toContain('Send an inquiry');
    // Guard must precede the inquiry section
    expect(src).toMatch(/!isReferencePreview[\s\S]*?Send an inquiry/);
  });

  /**
   * RCS-005 — Public B2B discovery cards must use the shared demo/pilot supplier helper.
   *
   * This keeps the live lt-b2b-001 directory card clearly labeled without changing
   * the public API payload or production supplier data.
   */
  it('RCS-005 — Public B2B discovery cards use demo/pilot supplier labeling', () => {
    const src = readFileSync(B2B_DISCOVERY_SRC, 'utf-8');

    expect(src).toContain('DEMO_PILOT_SUPPLIER_LABEL');
    expect(src).toContain('DEMO_PILOT_SUPPLIER_HELPER_TEXT');
    expect(src).toContain('isDemoPilotSupplierSlug');
    expect(src).toMatch(/isDemoPilotSupplierSlug\(supplier\.slug\)[\s\S]*?DEMO_PILOT_SUPPLIER_LABEL/);
  });
});

// ─── Behavioural check ────────────────────────────────────────────────────────

describe('PublicSupplierProfile — reference mode CTA suppression (RCS-003)', () => {
  /**
   * RCS-003 — When the API returns 404 and the reference config provides a profile,
   * the inquiry form section must NOT be rendered.
   *
   * Mechanism: getPublicSupplierBySlug rejects with { status: 404 }.
   * The component falls back to getPublicReferenceB2BSupplierBySlug (real config, not mocked),
   * which returns a profile with isReferencePreview: true for slug 'reference-weaving-unit'.
   * The component guards the inquiry form with {!isReferencePreview && …}.
   */
  it('RCS-003 — reference profile does not render the "Send an inquiry" form section', async () => {
    vi.mocked(publicB2BService.getPublicSupplierBySlug).mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { status: 404 }),
    );

    await act(async () => {
      render(
        <PublicSupplierProfile
          slug="reference-weaving-unit"
          onBack={() => {}}
          onSignIn={() => {}}
        />,
      );
    });

    // Wait for the reference profile to appear in the DOM
    await screen.findByText('Reference Weaving Unit');

    // Inquiry form section must be absent for reference profiles
    expect(screen.queryByText(/Send an inquiry/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Send inquiry/i })).toBeNull();
  });
});
