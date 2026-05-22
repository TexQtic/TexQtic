/**
 * Unit tests — public inquiry email wrappers
 *
 * Covers: sendBuyerInquiryAcknowledgementEmail,
 *         sendSupplierInquiryNotificationEmail,
 *         sendAdminInquiryAlertEmail
 *
 * Design authority: SOFT-LAUNCH-F1-P1B-INQUIRY-NOTIFICATION-LOOP-001
 * Feature:          FTR-B2C-004 / PRIT-033
 *
 * Tests:
 *   EML-001: sendBuyerInquiryAcknowledgementEmail returns DEV_LOGGED in test env
 *   EML-002: sendSupplierInquiryNotificationEmail returns DEV_LOGGED in test env
 *   EML-003: sendAdminInquiryAlertEmail returns DEV_LOGGED in test env
 *   EML-004: buyer acknowledgement template does NOT claim supplier received/replied
 *   EML-005: buyer acknowledgement template does NOT contain guarantee/promise language
 *   EML-006: sendBuyerInquiryAcknowledgementEmail — invalid `to` → throws EmailValidationError
 *   EML-007: sendSupplierInquiryNotificationEmail — geo_band + volume_band appear in text body
 *   EML-008: sendAdminInquiryAlertEmail — supplier_slug appears in admin alert text
 */

// ─── Config mock — forces test/no-SMTP path ───────────────────────────────────

vi.mock('../../config/index.js', () => ({
  config: {
    NODE_ENV: 'test',
    SMTP_HOST: undefined,
    SMTP_PORT: 587,
    SMTP_USER: undefined,
    SMTP_PASS: undefined,
    SMTP_FROM: undefined,
    FRONTEND_URL: 'http://localhost:4000',
    ADMIN_NOTIFICATION_EMAIL: null,
  },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendBuyerInquiryAcknowledgementEmail,
  sendSupplierInquiryNotificationEmail,
  sendAdminInquiryAlertEmail,
  EmailValidationError,
  type InquiryNotificationContext,
} from '../services/email/email.service.js';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('inquiry email wrappers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('EML-001: sendBuyerInquiryAcknowledgementEmail returns DEV_LOGGED in test env', async () => {
    const ctx: InquiryNotificationContext = {
      inquiry_category: 'GENERAL',
      source_surface: 'SUPPLIER_PROFILE',
      supplier_slug: 'acme-textiles',
    };
    const result = await sendBuyerInquiryAcknowledgementEmail('buyer@example.com', ctx);
    expect(result.status).toBe('DEV_LOGGED');
  });

  it('EML-002: sendSupplierInquiryNotificationEmail returns DEV_LOGGED in test env', async () => {
    const ctx: InquiryNotificationContext = {
      inquiry_category: 'SOURCING_INTENT',
      geo_band: 'South Asia',
      volume_band: '500-1000 units/month',
    };
    const result = await sendSupplierInquiryNotificationEmail('supplier@example.com', ctx);
    expect(result.status).toBe('DEV_LOGGED');
  });

  it('EML-003: sendAdminInquiryAlertEmail returns DEV_LOGGED in test env', async () => {
    const ctx: InquiryNotificationContext = {
      inquiry_category: 'CAPABILITY_FIT',
      source_surface: 'NAVBAR',
    };
    const result = await sendAdminInquiryAlertEmail('admin@example.com', ctx);
    expect(result.status).toBe('DEV_LOGGED');
  });

  it('EML-004: buyer acknowledgement does NOT claim supplier received or replied', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sendBuyerInquiryAcknowledgementEmail('buyer@example.com', {
      inquiry_category: 'GENERAL',
    });
    const output = logSpy.mock.calls.map(args => String(args[0])).join(' ');
    expect(output).not.toMatch(/supplier has received/i);
    expect(output).not.toMatch(/supplier.{0,20}replied/i);
    expect(output).not.toMatch(/supplier.{0,30}notified/i);
  });

  it('EML-005: buyer acknowledgement does NOT contain guarantee/promise language', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sendBuyerInquiryAcknowledgementEmail('buyer@example.com', {
      inquiry_category: 'SOURCING_INTENT',
    });
    const output = logSpy.mock.calls.map(args => String(args[0])).join(' ');
    expect(output).not.toMatch(/guarantee/i);
    expect(output).not.toMatch(/we will contact you/i);
    expect(output).not.toMatch(/you will hear back/i);
  });

  it('EML-006: invalid `to` address → throws EmailValidationError', async () => {
    await expect(
      sendBuyerInquiryAcknowledgementEmail('not-an-email', { inquiry_category: 'GENERAL' }),
    ).rejects.toBeInstanceOf(EmailValidationError);
  });

  it('EML-007: supplier notification text includes geo_band and volume_band', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sendSupplierInquiryNotificationEmail('supplier@example.com', {
      inquiry_category: 'SOURCING_INTENT',
      geo_band: 'South Asia',
      volume_band: '500-1000',
    });
    const output = logSpy.mock.calls.map(args => String(args[0])).join(' ');
    expect(output).toMatch(/South Asia/);
    expect(output).toMatch(/500-1000/);
  });

  it('EML-008: admin alert text includes supplier_slug when present', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sendAdminInquiryAlertEmail('admin@example.com', {
      inquiry_category: 'QUALIFICATION_CHECK',
      source_surface: 'SUPPLIER_PROFILE',
      supplier_slug: 'acme-textiles',
    });
    const output = logSpy.mock.calls.map(args => String(args[0])).join(' ');
    expect(output).toMatch(/acme-textiles/);
  });

  it('EML-009: buyer acknowledgement does NOT contain "track responses"', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sendBuyerInquiryAcknowledgementEmail('buyer@example.com', {
      inquiry_category: 'GENERAL',
    });
    const output = logSpy.mock.calls.map(args => String(args[0])).join(' ');
    expect(output).not.toMatch(/track responses/i);
  });

  it('EML-010: buyer acknowledgement does NOT contain payment or order language', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sendBuyerInquiryAcknowledgementEmail('buyer@example.com', {
      inquiry_category: 'SOURCING_INTENT',
    });
    const output = logSpy.mock.calls.map(args => String(args[0])).join(' ');
    expect(output).not.toMatch(/\bpayment\b/i);
    expect(output).not.toMatch(/\border\b/i);
    expect(output).not.toMatch(/guaranteed response/i);
  });

  it('EML-011: buyer acknowledgement text includes "recorded" and "TexQtic team"', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sendBuyerInquiryAcknowledgementEmail('buyer@example.com', {
      inquiry_category: 'GENERAL',
    });
    const output = logSpy.mock.calls.map(args => String(args[0])).join(' ');
    expect(output).toMatch(/recorded/i);
    expect(output).toMatch(/TexQtic team/i);
  });

  it('EML-012: admin alert includes public/pre-auth context note', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sendAdminInquiryAlertEmail('admin@example.com', {
      inquiry_category: 'GENERAL',
      source_surface: 'DIRECT',
    });
    const output = logSpy.mock.calls.map(args => String(args[0])).join(' ');
    expect(output).toMatch(/public\/pre-auth/i);
  });

  it('EML-013: supplier notification does NOT imply transaction or payment', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sendSupplierInquiryNotificationEmail('supplier@example.com', {
      inquiry_category: 'SOURCING_INTENT',
      geo_band: 'EU',
    });
    const output = logSpy.mock.calls.map(args => String(args[0])).join(' ');
    expect(output).not.toMatch(/\bpayment\b/i);
    expect(output).not.toMatch(/\border\b/i);
    expect(output).not.toMatch(/\bRFQ\b/i);
    expect(output).not.toMatch(/buyer is ready to transact/i);
  });
});
