import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@platform/auth-sdk'
import type { AuthSDKConfig } from '@platform/auth-sdk'
import App from './App'
import './index.css'

const authConfig: AuthSDKConfig = {
  identityCenterUrl: import.meta.env.VITE_IDENTITY_CENTER_URL,
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID,
  redirectUri: import.meta.env.VITE_AUTH_REDIRECT_URI,
  audience: 'platform-services',
  scope: 'openid profile email',
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider config={authConfig}>
      <App />
    </AuthProvider>
  </StrictMode>,
)
