import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { AuthForm } from '../../components/Auth/AuthFlows';

vi.mock('../../services/authService', () => ({
  login: vi.fn(),
  resolveTenantsByEmail: vi.fn(),
}));

import { login } from '../../services/authService';

describe('AuthForm login error mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows verification-specific guidance for AUTH_UNVERIFIED 401', async () => {
    vi.mocked(login).mockRejectedValueOnce({
      status: 401,
      code: 'AUTH_UNVERIFIED',
      message: 'Email verification required',
    });

    render(<AuthForm realm="CONTROL_PLANE" onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'secret123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /secure login/i }));

    await waitFor(() => {
      expect(screen.getByText(/email verification required/i)).toBeInTheDocument();
    });
  });

  it('keeps generic invalid credentials for AUTH_INVALID 401', async () => {
    vi.mocked(login).mockRejectedValueOnce({
      status: 401,
      code: 'AUTH_INVALID',
      message: 'Invalid credentials',
    });

    render(<AuthForm realm="CONTROL_PLANE" onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'secret123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /secure login/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials.')).toBeInTheDocument();
    });
  });
});
