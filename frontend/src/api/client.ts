import axios from 'axios';

// In dev, Vite proxies /api to the backend. In prod, set VITE_API_URL.
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}`
  : '';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

export const LOGIN_URL = `${baseURL}/api/auth/spotify/login`;

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Surface a friendly message; let callers handle 401 (redirect to login).
    return Promise.reject(err);
  },
);
