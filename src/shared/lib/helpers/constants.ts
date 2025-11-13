export const BASE_URL =
  import.meta.env.VITE_APP_REACT === 'dev'
    ? import.meta.env.VITE_APP_URL_DEV
    : import.meta.env.VITE_APP_URL_PROD;

export const API_MAP = {
  LOGIN: '/login',
  LOGOUT: '/logout',

  GET_ME: '/me',
};

export const API_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
};
