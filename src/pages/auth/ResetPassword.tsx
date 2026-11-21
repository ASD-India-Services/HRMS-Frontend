/**
 * Reset Password page.
 *
 * Route: /auth/reset-password?token=xxx
 * Validates token, then shows password form with strength rules.
 * Calls IC POST /auth/reset-password/ with {token, password}
 * On success: redirect to login.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Iconify } from '@/components/Iconify';
import { AuthLayout } from './AuthLayout';

const IC_URL = import.meta.env.VITE_IDENTITY_CENTER_URL;

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;

  const levels: PasswordStrength[] = [
    { score: 0, label: 'Too Weak', color: 'bg-error-main' },
    { score: 1, label: 'Weak', color: 'bg-warning-main' },
    { score: 2, label: 'Fair', color: 'bg-warning-main' },
    { score: 3, label: 'Good', color: 'bg-primary-main' },
    { score: 4, label: 'Strong', color: 'bg-success-main' },
  ];

  return levels[score];
}

function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least 1 uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least 1 lowercase letter');
  if (!/\d/.test(password)) errors.push('At least 1 digit');
  return errors;
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setTokenError('No reset token provided. Please use the link from your email.');
      return;
    }

    axios
      .get(`${IC_URL}/auth/reset-password/`, { params: { token } })
      .then(() => setTokenValid(true))
      .catch((err) => {
        setTokenValid(false);
        const detail = err.response?.data?.detail || err.response?.data?.error;
        if (err.response?.status === 410 || detail?.includes('expired')) {
          setTokenError('This reset link has expired. Please request a new one.');
        } else {
          setTokenError('Invalid or expired reset link. Please request a new password reset.');
        }
      });
  }, [token]);

  const passwordErrors = validatePassword(password);
  const strength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = passwordErrors.length === 0 && passwordsMatch && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      await axios.post(`${IC_URL}/auth/reset-password/`, { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/auth/callback', { replace: true }), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; error?: string; password?: string[] } } };
      const detail = axiosErr.response?.data?.detail
        || axiosErr.response?.data?.error
        || axiosErr.response?.data?.password?.[0]
        || 'Failed to reset password. Please try again.';
      setSubmitError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Token validation states ─────────────────────────────────────────────

  if (tokenValid === null) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-main border-t-transparent" />
          <span className="ml-3 text-sm text-ink-secondary">Validating reset link...</span>
        </div>
      </AuthLayout>
    );
  }

  if (tokenValid === false) {
    return (
      <AuthLayout>
        <div className="rounded-card bg-error-lighter p-6 text-center">
          <Iconify icon="error" width={48} className="mx-auto text-error-main" />
          <h2 className="mt-4 text-lg font-semibold text-error-dark">Invalid Reset Link</h2>
          <p className="mt-2 text-sm text-error-dark">{tokenError}</p>
          <ButtonLink to="/auth/forgot-password" variant="text" className="mt-4">
            Request a new reset link
          </ButtonLink>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="rounded-card bg-success-lighter p-6 text-center">
          <Iconify icon="success" width={48} className="mx-auto text-success-main" />
          <h2 className="mt-4 text-lg font-semibold text-success-dark">Password Reset Successfully!</h2>
          <p className="mt-2 text-sm text-success-dark">
            Redirecting to login...
          </p>
        </div>
      </AuthLayout>
    );
  }

  // ─── Password form ───────────────────────────────────────────────────────

  return (
    <AuthLayout>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink-primary">Reset Your Password</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Enter a new password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink-primary">
            New Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="mt-1"
          />

          {/* Strength meter */}
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < strength.score ? strength.color : 'bg-grey-200'
                    }`}
                  />
                ))}
              </div>
              <p className={`mt-1 text-xs ${strength.score >= 3 ? 'text-success-main' : 'text-ink-secondary'}`}>
                {strength.label}
              </p>
            </div>
          )}

          {password.length > 0 && passwordErrors.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {passwordErrors.map((err) => (
                <li key={err} className="text-xs text-error-main">• {err}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-ink-primary">
            Confirm New Password
          </label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="mt-1"
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1 text-xs text-error-main">Passwords do not match</p>
          )}
        </div>

        {submitError && (
          <div className="rounded-md bg-error-lighter p-3">
            <p className="text-sm text-error-dark">{submitError}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full"
        >
          {submitting ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>
    </AuthLayout>
  );
}

