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
<<<<<<< HEAD
  const [waitingForAuth, setWaitingForAuth] = useState(true)
  const [callbackError, setCallbackError] = useState<string | null>(null)

  useEffect(() => {
    // Give the AuthProvider time to process the callback and update state.
    // The token exchange happens async, so we poll until isLoading is false.
    const timer = setTimeout(() => {
      setWaitingForAuth(false)
    }, 2000) // Wait up to 2 seconds for token exchange to complete

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Don't navigate while still waiting or loading.
    if (waitingForAuth) return
=======

  useEffect(() => {
    // Wait until AuthProvider finishes processing the callback
>>>>>>> b5b6a8e0cc3f5c7ccaeb95e76d1f3ed213be73fe
    if (authState.isLoading) return

    if (authState.isAuthenticated) {
      navigate('/dashboard', { replace: true })
<<<<<<< HEAD
      return
    }

    setCallbackError('Sign-in could not be completed. Please try again.')
  }, [waitingForAuth, authState.isLoading, authState.isAuthenticated, navigate])
=======
    }
    // If not loading and not authenticated after callback, something failed
    // Don't redirect to login here -- ProtectedRoute handles that
  }, [authState.isLoading, authState.isAuthenticated, navigate])
>>>>>>> b5b6a8e0cc3f5c7ccaeb95e76d1f3ed213be73fe

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mx-auto" />
        <p className="text-gray-600">
          {callbackError ?? 'Completing sign in...'}
        </p>
      </div>
    </div>
  )
}
