/**
 * Login page — redirects to Identity Center hosted login.
 *
 * Local login form has been removed. Authentication is now handled
 * exclusively by the Identity Center via the @platform/auth-sdk
 * OAuth2 PKCE flow. The Identity Center is the central authority for
 * users and credentials across the platform.
 */
import { useEffect } from 'react'
import { useAuth } from '@platform/auth-sdk'

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    // If not authenticated and SDK is ready, redirect to Identity Center
    if (!isLoading && !isAuthenticated) {
      login()
    }
  }, [isLoading, isAuthenticated, login])

  // Show loading while SDK checks auth state or while redirecting
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="text-center">
        <img
          src="/favicon.svg"
          alt="DigiHRMS"
          className="mx-auto h-12 w-auto mb-6"
        />
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mx-auto" />
        <p className="text-gray-500 text-sm">Redirecting to login...</p>
      </div>
    </div>
  )
}
