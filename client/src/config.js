const isProd = import.meta.env.PROD;

export const API_BASE_URL = isProd 
  ? window.location.origin
  : 'http://localhost:3000';

export const SOCKET_URL = isProd
  ? window.location.origin
  : 'http://localhost:3000';
