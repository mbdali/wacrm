import { describe, expect, it } from "vitest";
import { forwardPayload, isServiceWindowOpen } from "./forward";
import type { Conversation, Message } from "@/types";

const MEDIA = "https://crm.example.com/storage/v1/object/public/chat-media/acc/1730000000000-photo.jpg";

function msg(overrides: Partial<Message>): Message {
  return {
    id: "m1",
    conversation_id: "c1",
    sender_type: "customer",
    content_type: "text",
    status: "delivered",
    created_at: "2026-10-19T10:00:00Z",
    ...overrides,
  } as Message;
}

describe("forwardPayload", () => {
  it("forwards text as text", () => {
    expect(forwardPayload(msg({ content_text: "Hello" }))).toEqual({
      message_type: "text",
      content_text: "Hello",
    });
  });

  it("forwards media by its public URL, keeping the caption", () => {
    expect(
      forwardPayload(
        msg({ content_type: "image", media_url: MEDIA, content_text: "Receipt" }),
      ),
    ).toEqual({ message_type: "image", media_url: MEDIA, content_text: "Receipt" });
  });

  it("sends audio without a caption", () => {
    expect(
      forwardPayload(msg({ content_type: "audio", media_url: MEDIA, content_text: "x" })),
    ).toEqual({ message_type: "audio", media_url: MEDIA });
  });

  it("keeps a document's filename and doesn't repeat it as a caption", () => {
    expect(
      forwardPayload(
        msg({ content_type: "document", media_url: MEDIA, content_text: "invoice.pdf" }),
      ),
    ).toEqual({ message_type: "document", media_url: MEDIA, filename: "invoice.pdf" });
  });

  it("refuses media only reachable through the auth-gated proxy", () => {
    expect(
      forwardPayload(msg({ content_type: "image", media_url: "/api/whatsapp/media/123" })),
    ).toBeNull();
  });

  it("refuses templates, locations, interactive replies and empty text", () => {
    expect(forwardPayload(msg({ content_type: "template", content_text: "Hi" }))).toBeNull();
    expect(forwardPayload(msg({ content_type: "location", content_text: "Here" }))).toBeNull();
    expect(forwardPayload(msg({ content_type: "interactive", content_text: "Yes" }))).toBeNull();
    expect(forwardPayload(msg({ content_text: "   " }))).toBeNull();
  });
});

describe("isServiceWindowOpen", () => {
  const now = new Date("2026-10-19T12:00:00Z").getTime();
  const conv = (last_inbound_at: string | null) =>
    ({ id: "c", last_inbound_at }) as Conversation;

  it("is open within 24h of the last customer message", () => {
    expect(isServiceWindowOpen(conv("2026-10-18T12:30:00Z"), now)).toBe(true);
  });

  it("is closed after 24h, or when the customer never wrote", () => {
    expect(isServiceWindowOpen(conv("2026-10-18T11:59:00Z"), now)).toBe(false);
    expect(isServiceWindowOpen(conv(null), now)).toBe(false);
  });
});
