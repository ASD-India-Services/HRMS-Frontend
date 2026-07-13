import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@platform/auth-sdk'

/**
 * OAuth2 callback page.
 * The Identity Center redirects here after authentication.
 * The AuthProvider handles the token exchange automatically;
 * this page waits for auth state to settle before navigating.
 */
export function AuthCallback() {
  const { authState } = useAuth()
  const navigate = useNavigate()
  const [waitingForAuth, setWaitingForAuth] = useState(true)

  useEffect(() => {
    // Give the AuthProvider time to process the callback and update state.
    // The token exchange happens async, so we poll until isLoading is false.
    const timer = setTimeout(() => {
      setWaitingForAuth(false)
    }, 2000) // Wait up to 2 seconds for token exchange to complete

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Don't navigate while still waiting or loading
    if (waitingForAuth) return
    if (authState.isLoading) return

    // Navigate to dashboard regardless — ProtectedRoute handles the rest
    navigate('/dashboard', { replace: true })
  }, [waitingForAuth, authState.isLoading, authState.isAuthenticated, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mx-auto" />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}
