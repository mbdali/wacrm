import type { Conversation, Message } from "@/types";
import { mediaFilename } from "@/lib/media/filename";

const WINDOW_MS = 24 * 60 * 60 * 1000;

/** The `/api/whatsapp/send` body fields that re-send a message as-is. */
export interface ForwardPayload {
  message_type: "text" | "image" | "video" | "audio" | "document";
  content_text?: string;
  media_url?: string;
  filename?: string;
}

/**
 * What to send to forward `message`, or null when it can't be forwarded
 * as a free-form message:
 *   - templates, interactive replies and locations aren't re-sendable
 *     content (forwarding a template comes later, via the template picker);
 *   - media must be a public https URL Meta can fetch. Inbound media that
 *     only exists behind our auth-gated `/api/whatsapp/media/<id>` proxy
 *     (not mirrored into storage) can't be passed to Meta by link.
 */
export function forwardPayload(message: Message): ForwardPayload | null {
  const text = message.content_text?.trim() || undefined;
  switch (message.content_type) {
    case "text":
      return text ? { message_type: "text", content_text: text } : null;
    case "image":
    case "video":
    case "audio":
    case "document": {
      const url = message.media_url;
      if (!url || !/^https?:\/\//i.test(url)) return null;
      if (message.content_type === "audio") {
        return { message_type: "audio", media_url: url };
      }
      if (message.content_type === "document") {
        const filename = mediaFilename(message);
        // A document's content_text is its filename unless the sender
        // captioned it; don't repeat the filename as a caption.
        const caption = text && text !== filename ? text : undefined;
        return {
          message_type: "document",
          media_url: url,
          filename,
          ...(caption ? { content_text: caption } : {}),
        };
      }
      return {
        message_type: message.content_type,
        media_url: url,
        ...(text ? { content_text: text } : {}),
      };
    }
    default:
      return null;
  }
}

/**
 * True while the customer's 24-hour service window is open — the only
 * time WhatsApp accepts a free-form (non-template) message, forwarded
 * ones included.
 */
export function isServiceWindowOpen(c: Conversation, now: number): boolean {
  if (!c.last_inbound_at) return false;
  return now - new Date(c.last_inbound_at).getTime() < WINDOW_MS;
}
