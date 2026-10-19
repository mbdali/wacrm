"use client";

import { createContext, useContext } from "react";
import type { Message } from "@/types";

/**
 * Inbox-level actions that deep children (message bubbles, the hover
 * toolbar) trigger without threading callbacks through MessageThread.
 * Provided by the inbox page; null anywhere else, where the features
 * simply don't render.
 */
export interface InboxChatActions {
  /** Open the chat for a phone number, creating contact + thread if new. */
  startChatWithPhone: (phone: string) => Promise<boolean>;
  /** Open the forward dialog for a message. */
  forwardMessage: (message: Message) => void;
}

export const InboxChatContext = createContext<InboxChatActions | null>(null);

export function useInboxChat(): InboxChatActions | null {
  return useContext(InboxChatContext);
}
