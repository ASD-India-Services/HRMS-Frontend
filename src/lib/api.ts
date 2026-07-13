/**
 * Shared Axios instance with auth interceptor for HRMS Backend API calls.
 */

import axios from 'axios';
import { createAuthInterceptor } from '@platform/auth-sdk';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

createAuthInterceptor(api, {
  identityCenterUrl: import.meta.env.VITE_IDENTITY_CENTER_URL,
});

export default api;
