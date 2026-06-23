const TOKEN_KEY = 'mocktest_auth_token';

export function clearLegacyAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include',
  });
}
