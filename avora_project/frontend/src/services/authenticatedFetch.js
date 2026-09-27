export const authenticatedFetch = (url, options = {}) => {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem('avora_token');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
};
