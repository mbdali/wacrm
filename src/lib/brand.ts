// Single source of truth for this fork's branding. Upstream copy that
// mentions the product name is rewritten at message-load time (see
// `applyBranding` / src/i18n/request.ts) so messages/*.json stay
// untouched and upstream merges don't conflict on them.
//
// Logo assets: public/brand/icon.png (UI), src/app/icon.png (favicon),
// src/app/apple-icon.png (home-screen icon).

export const BRAND = {
  name: "RaqmiChats",
  description: "Customer conversations and CRM for WhatsApp.",
  logo: "/brand/icon.png",
} as const;

// Strings upstream uses for the product name. Each locale's
// Sidebar.title is added at runtime since it's translated.
const UPSTREAM_NAMES = ["CRM Template", "wacrm"];

type Messages = { [key: string]: string | Messages };

function replaceAll(value: Messages, names: string[]): Messages {
  const out: Messages = {};
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === "string") {
      out[key] = names.reduce((s, n) => s.split(n).join(BRAND.name), v);
    } else {
      out[key] = replaceAll(v, names);
    }
  }
  return out;
}

export function applyBranding(messages: Messages): Messages {
  const sidebar = messages.Sidebar as Messages | undefined;
  const localizedName =
    typeof sidebar?.title === "string" ? [sidebar.title] : [];
  // Longest first so "CRM Template for WhatsApp" wins over "CRM Template".
  const names = [...localizedName, ...UPSTREAM_NAMES].sort(
    (a, b) => b.length - a.length,
  );
  const branded = replaceAll(messages, names);
  branded.Metadata = {
    ...(branded.Metadata as Messages),
    description: BRAND.description,
  };
  return branded;
}
