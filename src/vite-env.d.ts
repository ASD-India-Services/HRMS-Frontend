/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IDENTITY_CENTER_URL: string
  readonly VITE_AUTH_CLIENT_ID: string
  readonly VITE_AUTH_REDIRECT_URI: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_CRM_FRONTEND_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
