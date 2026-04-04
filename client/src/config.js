const isProd = import.meta.env.PROD;

export const API_BASE_URL = isProd 
  ? window.location.origin
  : 'http://localhost:3000';

export const SOCKET_URL = isProd
  ? window.location.origin
  : 'http://localhost:3000';

export const GOOGLE_CLIENT_ID = '562270522404-12p4p779nthnlt086mhjpriffko9ici8.apps.googleusercontent.com';
