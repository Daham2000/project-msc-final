const TOKEN_KEY = "smart-city-token";
const USER_KEY = "smart-city-user";

export function saveAuth(token: string, user: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, user);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  return localStorage.getItem(USER_KEY);
}
