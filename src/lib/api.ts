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

// DigiHRMS access gate: the backend returns 403 HRMS_ACCESS_NOT_GRANTED when an
// admin hasn't granted this user DigiHRMS. App shows a full-screen notice.
export const HRMS_ACCESS_DENIED_EVENT = 'hrms-access-denied';
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 403 && error.response.data?.code === 'HRMS_ACCESS_NOT_GRANTED') {
      window.dispatchEvent(new CustomEvent(HRMS_ACCESS_DENIED_EVENT));
    }
    return Promise.reject(error);
  },
);

export default api;
