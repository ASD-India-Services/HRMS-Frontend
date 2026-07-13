/**
 * Forgot Password page.
 *
 * Route: /auth/forgot-password
 * Calls IC POST /auth/forgot-password/ with {email}
 * Always shows "Check your email" to prevent email enumeration.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        {!submitted ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
              <p className="mt-2 text-sm text-gray-600">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Remember your password?{' '}
              <Link to="/auth/callback" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Check Your Email</h2>
            <p className="mt-2 text-sm text-gray-600">
              If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
            </p>
            <p className="mt-4 text-xs text-gray-400">
              Didn't receive an email? Check your spam folder or try again.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-6 text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Try a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
