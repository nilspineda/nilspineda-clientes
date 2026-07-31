const TOTP_TRUST_DURATION = 20 * 60 * 1000;
const STORAGE_KEY = "totp_trust";

export function isTotpTrusted(userId) {
  if (!userId) return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || data.uid !== userId) return false;
    return Date.now() - data.verifiedAt < TOTP_TRUST_DURATION;
  } catch {
    return false;
  }
}

export function setTotpTrusted(userId) {
  if (!userId) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ uid: userId, verifiedAt: Date.now() }));
  } catch {
    // ignore storage errors
  }
}

export function clearTotpTrust() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}
