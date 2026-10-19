import { toDialablePhone } from "@/lib/whatsapp/phone-utils";

export type PhoneTextSegment =
  | { kind: "text"; text: string }
  | { kind: "phone"; text: string; phone: string };

// Either an explicitly international number (`+` or `00`, formatting
// allowed: "+971 50 123 4567") or a bare 10–15 digit run ("971501234567").
// Shorter bare runs and anything with dots stay plain text, so dates,
// times, prices and order numbers aren't turned into links.
const PHONE_RE = /(?:\+|\b00)\d[\d\s()-]{6,20}\d|\b\d{10,15}\b/g;

/**
 * Split message text into plain-text and phone-number segments, so the
 * inbox can make numbers clickable (WhatsApp Web's "chat with this
 * number"). `phone` is the dialable `+<digits>` form.
 */
export function splitPhoneNumbers(text: string): PhoneTextSegment[] {
  const out: PhoneTextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(PHONE_RE)) {
    const raw = match[0].trimEnd();
    const phone = toDialablePhone(raw);
    if (!phone) continue;
    const start = match.index ?? 0;
    if (start > last) out.push({ kind: "text", text: text.slice(last, start) });
    out.push({ kind: "phone", text: raw, phone });
    last = start + raw.length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}
