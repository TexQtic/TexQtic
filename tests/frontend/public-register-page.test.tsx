import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PublicRegister } from '../../components/Public/PublicRegister';
import { APIError } from '../../services/apiClient';
import { submitPublicRegister } from '../../services/publicRegisterService';

vi.mock('../../services/publicRegisterService', () => ({
  submitPublicRegister: vi.fn(),
}));

const submitPublicRegisterMock = vi.mocked(submitPublicRegister);

const NAV_STUB = {
  activeSection: 'home' as const,
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

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
  globalThis.history.replaceState({}, '', '/register');
});

function getRoleCardButton(roleLabel: 'Supplier' | 'Buyer' | 'Service Provider') {
  const roleTitle = screen.getByText(roleLabel, { selector: 'div' });
  const button = roleTitle.closest('button');
  if (!button) {
    throw new Error(`Unable to locate role button for ${roleLabel}`);
  }

  return button;
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Paresh Patel' } });
  fireEvent.change(screen.getByLabelText('Company Name'), { target: { value: 'TexQtic Labs' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'paresh@texqtic.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Passw0rd!' } });
}

function openForm(roleLabel: 'Supplier' | 'Buyer' | 'Service Provider') {
  fireEvent.click(getRoleCardButton(roleLabel));
  fireEvent.click(screen.getByRole('button', { name: /^Continue$/i }));
}

function mockSuccess(roleIntent: 'supplier' | 'buyer' | 'service_provider') {
  submitPublicRegisterMock.mockResolvedValue({
    success: true,
    provisional: true,
    roleIntent,
    tenantId: 'tenant_123',
    tenantSlug: 'texqtic-labs',
    organizationStatus: 'PENDING_VERIFICATION',
    membershipRole: 'OWNER',
    nextStep: 'SIGN_IN_TO_CONTINUE_ONBOARDING',
  });
}

describe('PublicRegister', () => {
  it('renders role-first direct registration entry shell', () => {
    render(
      <PublicRegister
        nav={NAV_STUB}
        onBack={() => {}}
        onSignIn={() => {}}
        onRequestAccess={() => {}}
      />,
    );

    expect(screen.getByRole('heading', { name: /Join TexQtic/i })).toBeInTheDocument();
    expect(getRoleCardButton('Supplier')).toBeInTheDocument();
    expect(getRoleCardButton('Buyer')).toBeInTheDocument();
    expect(getRoleCardButton('Service Provider')).toBeInTheDocument();
  });

  it('captures role intent and moves to registration form', () => {
    render(
      <PublicRegister
        nav={NAV_STUB}
        onBack={() => {}}
        onSignIn={() => {}}
        onRequestAccess={() => {}}
      />,
    );

    const continueBtn = screen.getByRole('button', { name: /^Continue$/i });
    expect(continueBtn).toBeDisabled();

  fireEvent.click(getRoleCardButton('Supplier'));
    expect(continueBtn).not.toBeDisabled();

    fireEvent.click(continueBtn);

    expect(screen.getByRole('heading', { name: /Create Your Account/i })).toBeInTheDocument();
    expect(screen.getByText(/roleIntent: supplier/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Provisional Account/i })).toBeInTheDocument();
  });

  it('supports alias preselection via initialRoleIntent and submits service_provider payload', async () => {
    mockSuccess('service_provider');

    render(
      <PublicRegister
        nav={NAV_STUB}
        onBack={() => {}}
        onSignIn={() => {}}
        onRequestAccess={() => {}}
        initialRoleIntent="service_provider"
      />,
    );

    const continueBtn = screen.getByRole('button', { name: /^Continue$/i });
    expect(continueBtn).not.toBeDisabled();

    fireEvent.click(continueBtn);
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /Create Provisional Account/i }));

    await waitFor(() => {
      expect(submitPublicRegisterMock).toHaveBeenCalledOnce();
    });

    expect(submitPublicRegisterMock.mock.calls[0]?.[0].roleIntent).toBe('service_provider');
  });

  it('submits supplier payload including allowlisted attribution and excludes token-like params', async () => {
    globalThis.history.replaceState(
      {},
      '',
      '/register?source=web&utm_source=google&utm_medium=cpc&utm_campaign=q2&cid=camp-1&ref=abc123&context=launch&token=secret123',
    );
    mockSuccess('supplier');

    render(
      <PublicRegister
        nav={NAV_STUB}
        onBack={() => {}}
        onSignIn={() => {}}
        onRequestAccess={() => {}}
      />,
    );

    openForm('Supplier');
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText('Phone (optional)'), { target: { value: '+919998887776' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Provisional Account/i }));

    await waitFor(() => {
      expect(submitPublicRegisterMock).toHaveBeenCalledOnce();
    });

    const payload = submitPublicRegisterMock.mock.calls[0]?.[0];
    expect(payload.roleIntent).toBe('supplier');
    expect(payload.attribution?.utmSource).toBe('google');
    expect(payload.attribution?.campaignId).toBe('camp-1');
    expect(payload.attribution?.referralCode).toBe('abc123');
    expect(payload.attribution?.firstTouchTimestamp).toBeTruthy();
    expect(payload.attribution?.landingPage).toContain('utm_source=google');
    expect(payload.attribution?.landingPage).not.toContain('token=');
  });

  it('submits buyer alias payload', async () => {
    mockSuccess('buyer');

    render(
      <PublicRegister
        nav={NAV_STUB}
        onBack={() => {}}
        onSignIn={() => {}}
        onRequestAccess={() => {}}
        initialRoleIntent="buyer"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Continue$/i }));
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /Create Provisional Account/i }));

    await waitFor(() => {
      expect(submitPublicRegisterMock).toHaveBeenCalledOnce();
    });

    expect(submitPublicRegisterMock.mock.calls[0]?.[0].roleIntent).toBe('buyer');
  });

  it('shows provisional success guidance after submit', async () => {
    mockSuccess('supplier');

    render(
      <PublicRegister
        nav={NAV_STUB}
        onBack={() => {}}
        onSignIn={() => {}}
        onRequestAccess={() => {}}
      />,
    );

    openForm('Supplier');
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /Create Provisional Account/i }));

    expect(await screen.findByRole('heading', { name: /Registration Submitted/i })).toBeInTheDocument();
    expect(screen.getByText(/Business verification has been submitted/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to Sign In/i })).toBeInTheDocument();
  });

  it('shows duplicate email guidance on DUPLICATE_EMAIL', async () => {
    submitPublicRegisterMock.mockRejectedValue(
      new APIError(409, 'An account already exists for this email.', 'DUPLICATE_EMAIL'),
    );

    render(
      <PublicRegister
        nav={NAV_STUB}
        onBack={() => {}}
        onSignIn={() => {}}
        onRequestAccess={() => {}}
      />,
    );

    openForm('Supplier');
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /Create Provisional Account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already registered/i);
  });

  it('shows safe server error for backend failures', async () => {
    submitPublicRegisterMock.mockRejectedValue(new APIError(500, 'boom', 'INTERNAL_ERROR'));

    render(
      <PublicRegister
        nav={NAV_STUB}
        onBack={() => {}}
        onSignIn={() => {}}
        onRequestAccess={() => {}}
      />,
    );

    openForm('Supplier');
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /Create Provisional Account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/i);
  });

  it('keeps request-access fallback action available', () => {
    const onRequestAccess = vi.fn();

    render(
      <PublicRegister
        nav={NAV_STUB}
        onBack={() => {}}
        onSignIn={() => {}}
        onRequestAccess={onRequestAccess}
      />,
    );

    const requestAccessButtons = screen.getAllByRole('button', { name: /Request Access/i });
    const fallbackAction = requestAccessButtons.at(-1);
    if (!fallbackAction) {
      throw new Error('Request Access fallback button not found');
    }
    fireEvent.click(fallbackAction);
    expect(onRequestAccess).toHaveBeenCalledOnce();
  });
});
