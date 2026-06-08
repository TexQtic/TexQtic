import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PublicRegister } from '../../components/Public/PublicRegister';

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
  onRequestAccess: () => {},
};

afterEach(() => {
  cleanup();
});

function getRoleCardButton(roleLabel: 'Supplier' | 'Buyer' | 'Service Provider') {
  const roleTitle = screen.getByText(roleLabel, { selector: 'div' });
  const button = roleTitle.closest('button');
  if (!button) {
    throw new Error(`Unable to locate role button for ${roleLabel}`);
  }

  return button;
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

  it('captures role intent and moves to next placeholder step', () => {
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

    expect(screen.getByRole('heading', { name: /Next Step Preparing/i })).toBeInTheDocument();
    expect(screen.getByText(/roleIntent: supplier/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to Sign In/i })).toBeInTheDocument();
  });

  it('supports alias preselection via initialRoleIntent', () => {
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
    expect(screen.getByText(/roleIntent: service_provider/i)).toBeInTheDocument();
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
