/**
 * Reset Password page.
 *
 * Route: /auth/reset-password?token=xxx
 * Validates token, then shows password form with strength rules.
 * Calls IC POST /auth/reset-password/ with {token, password}
 * On success: redirect to login.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

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
    { score: 0, label: 'Too Weak', color: 'bg-red-500' },
    { score: 1, label: 'Weak', color: 'bg-orange-500' },
    { score: 2, label: 'Fair', color: 'bg-yellow-500' },
    { score: 3, label: 'Good', color: 'bg-blue-500' },
    { score: 4, label: 'Strong', color: 'bg-green-500' },
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
      <PageWrapper>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-600">Validating reset link...</span>
        </div>
      </PageWrapper>
    );
  }

  if (tokenValid === false) {
    return (
      <PageWrapper>
        <div className="rounded-md bg-red-50 p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-red-800">Invalid Reset Link</h2>
          <p className="mt-2 text-sm text-red-700">{tokenError}</p>
          <Link
            to="/auth/forgot-password"
            className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            Request a new reset link
          </Link>
        </div>
      </PageWrapper>
    );
  }

  if (success) {
    return (
      <PageWrapper>
        <div className="rounded-md bg-green-50 p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-green-800">Password Reset Successfully!</h2>
          <p className="mt-2 text-sm text-green-700">
            Redirecting to login...
          </p>
        </div>
      </PageWrapper>
    );
  }

  // ─── Password form ───────────────────────────────────────────────────────

  return (
    <PageWrapper>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Reset Your Password</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter a new password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />

          {/* Strength meter */}
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < strength.score ? strength.color : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className={`mt-1 text-xs ${strength.score >= 3 ? 'text-green-600' : 'text-gray-500'}`}>
                {strength.label}
              </p>
            </div>
          )}

          {password.length > 0 && passwordErrors.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {passwordErrors.map((err) => (
                <li key={err} className="text-xs text-red-600">• {err}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
          )}
        </div>

        {submitError && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{submitError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </PageWrapper>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
