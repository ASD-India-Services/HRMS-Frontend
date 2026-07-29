import { useEffect } from 'react'
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

  useEffect(() => {
    // Wait until AuthProvider finishes processing the callback
    if (authState.isLoading) return

    if (authState.isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
    // If not loading and not authenticated after callback, something failed
    // Don't redirect to login here -- ProtectedRoute handles that
  }, [authState.isLoading, authState.isAuthenticated, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mx-auto" />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}
