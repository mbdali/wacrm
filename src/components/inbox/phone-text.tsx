"use client";

import { useTranslations } from "next-intl";
import { splitPhoneNumbers } from "@/lib/inbox/phone-links";
import { useInboxChat } from "./inbox-chat-context";

/**
 * Message text with phone numbers made clickable: clicking one opens the
 * chat with that number, like WhatsApp Web. Plain text outside the inbox
 * (no InboxChatContext).
 */
export function PhoneText({ text }: { text?: string | null }) {
  const chat = useInboxChat();
  const t = useTranslations("Inbox.bubble");
  if (!text) return null;
  if (!chat) return <>{text}</>;

  return (
    <>
      {splitPhoneNumbers(text).map((seg, i) =>
        seg.kind === "text" ? (
          seg.text
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => void chat.startChatWithPhone(seg.phone)}
            title={t("chatWith", { phone: seg.phone })}
            className="underline decoration-dotted underline-offset-2 hover:text-primary"
          >
            {seg.text}
          </button>
        ),
      )}
    </>
  );
}
