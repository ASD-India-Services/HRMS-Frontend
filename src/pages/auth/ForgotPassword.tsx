/**
 * Forgot Password page.
 *
 * Route: /auth/forgot-password
 * Calls IC POST /auth/forgot-password/ with {email}
 * Always shows "Check your email" to prevent email enumeration.
 */

import { useState } from 'react';
import axios from 'axios';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Iconify } from '@/components/Iconify';
import { AuthLayout } from './AuthLayout';
import { Input } from '@/components/ui/Input';

const IC_URL = import.meta.env.VITE_IDENTITY_CENTER_URL;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      await axios.post(`${IC_URL}/auth/forgot-password/`, { email: email.trim() });
    } catch {
      // Always show success to prevent email enumeration
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <AuthLayout>
        {!submitted ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-ink-primary">Forgot Password</h1>
              <p className="mt-2 text-sm text-ink-secondary">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink-primary">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full"
              >
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-secondary">
              Remember your password?{' '}
              <ButtonLink to="/auth/callback" variant="text" size="small">
                Sign in
              </ButtonLink>
            </p>
          </>
        ) : (
          <div className="text-center">
            <Iconify icon="success" width={48} className="mx-auto text-success-main" />
            <h2 className="mt-4 text-lg font-semibold text-ink-primary">Check Your Email</h2>
            <p className="mt-2 text-sm text-ink-secondary">
              If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
            </p>
            <p className="mt-4 text-xs text-ink-disabled">
              Didn't receive an email? Check your spam folder or try again.
            </p>
            <Button variant="text" className="mt-6" onClick={() => setSubmitted(false)}>
              Try a different email
            </Button>
          </div>
        )}
    </AuthLayout>
  );
}
