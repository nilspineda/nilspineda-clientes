export function normalizeUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (trimmed === "") return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function normalizeWhatsapp(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\D/g, "");
  if (!cleaned) return null;

  // If already starts with country code 57 (Colombia), keep as-is
  if (cleaned.startsWith("57")) return cleaned;

  // If it's 10 digits (typical national mobile), prepend 57
  if (cleaned.length === 10) return "57" + cleaned;

  // If starts with leading 0 + 10 digits -> drop leading 0 and prepend 57
  if (cleaned.length === 11 && cleaned.startsWith("0"))
    return "57" + cleaned.slice(1);

  // Fallback: return cleaned (caller can decide)
  return cleaned;
}

export function formatWhatsapp(raw) {
  const cleaned = normalizeWhatsapp(raw);
  if (!cleaned) return null;

  // Colombian formatting for country code 57
  if (cleaned.startsWith("57")) {
    const rest = cleaned.slice(2);
    const p1 = rest.slice(0, 3);
    const p2 = rest.slice(3, 6);
    const p3 = rest.slice(6);
    return `+57 ${[p1, p2, p3].filter(Boolean).join(" ")}`;
  }

  // Generic: show +<digits>
  return `+${cleaned}`;
}
