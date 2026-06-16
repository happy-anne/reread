const PIN_HASH_KEY = "reread_pin_hash";
const UNLOCKED_KEY = "reread_pin_unlocked";

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hasPin(): boolean {
  if (typeof localStorage === "undefined") return false;
  return !!localStorage.getItem(PIN_HASH_KEY);
}

export async function setPin(pin: string) {
  const hash = await hashPin(pin);
  localStorage.setItem(PIN_HASH_KEY, hash);
}

export function removePin() {
  localStorage.removeItem(PIN_HASH_KEY);
  sessionStorage.removeItem(UNLOCKED_KEY);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === localStorage.getItem(PIN_HASH_KEY);
}

export function isUnlocked(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(UNLOCKED_KEY) === "1";
}

export function markUnlocked() {
  sessionStorage.setItem(UNLOCKED_KEY, "1");
}
