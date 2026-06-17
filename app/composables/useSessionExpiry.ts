const SESSION_DAYS = 30;
const LOGIN_AT_KEY = "reread_login_at";

export function markLoginNow() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOGIN_AT_KEY, String(Date.now()));
}

export function getLoginAt(): number | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(LOGIN_AT_KEY);
  return v ? Number(v) : null;
}

export function getDaysRemaining(): number | null {
  const loginAt = getLoginAt();
  if (!loginAt) return null;
  // Compare calendar dates so D-day decrements on date change, not after 24h
  const loginMidnight = new Date(loginAt);
  loginMidnight.setHours(0, 0, 0, 0);
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const elapsedDays = Math.round((todayMidnight.getTime() - loginMidnight.getTime()) / 86400000);
  return SESSION_DAYS - elapsedDays;
}

export function clearLoginAt() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LOGIN_AT_KEY);
}
