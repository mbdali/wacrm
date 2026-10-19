"use client";

import { useMemo, useState } from "react";
import { Forward, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { Conversation, Message } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { forwardPayload, isServiceWindowOpen } from "@/lib/inbox/forward";

interface ForwardDialogProps {
  /** The message being forwarded; null closes the dialog. */
  message: Message | null;
  conversations: Conversation[];
  /** The thread the message came from — not offered as a target. */
  sourceConversationId?: string | null;
  onClose: () => void;
}

/**
 * Pick a chat to forward a message to. Only chats inside the customer's
 * 24-hour window are selectable: outside it WhatsApp accepts templates
 * only, so a free-form forward would be rejected.
 */
export function ForwardDialog({
  message,
  conversations,
  sourceConversationId,
  onClose,
}: ForwardDialogProps) {
  const t = useTranslations("Inbox.forward");
  const [search, setSearch] = useState("");
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  // Read once per open; the list doesn't need to tick while it's up.
  const [now] = useState(() => Date.now());

  const targets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations
      .filter((c) => c.id !== sourceConversationId)
      .filter((c) => {
        if (!q) return true;
        const name = c.contact?.name?.toLowerCase() ?? "";
        const phone = c.contact?.phone?.toLowerCase() ?? "";
        return name.includes(q) || phone.includes(q);
      })
      .map((c) => ({ conversation: c, open: isServiceWindowOpen(c, now) }))
      // Forwardable chats first, then most recent activity.
      .sort((a, b) => Number(b.open) - Number(a.open));
  }, [conversations, sourceConversationId, search, now]);

  function close() {
    setSearch("");
    setSendingTo(null);
    onClose();
  }

  async function forwardTo(target: Conversation) {
    if (!message || sendingTo) return;
    const payload = forwardPayload(message);
    if (!payload) return;
    const name = target.contact?.name || target.contact?.phone || "";
    setSendingTo(target.id);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: target.id, ...payload }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(t("failed", { reason: json.error ?? res.statusText }));
        setSendingTo(null);
        return;
      }
      toast.success(t("sent", { name }));
      close();
    } catch (err) {
      toast.error(
        t("failed", { reason: err instanceof Error ? err.message : String(err) }),
      );
      setSendingTo(null);
    }
  }

  return (
    <Dialog open={!!message} onOpenChange={(next) => !next && close()}>
      <DialogContent className="border-border bg-popover sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-popover-foreground">
            <Forward className="h-4 w-4 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("hint")}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="border-border bg-muted pl-9 text-sm text-foreground placeholder:text-muted-foreground"
            autoFocus
          />
        </div>

        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {targets.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("noResults")}
            </p>
          ) : (
            targets.map(({ conversation: c, open }) => (
              <button
                key={c.id}
                type="button"
                disabled={!open || !!sendingTo}
                onClick={() => forwardTo(c)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border border-border bg-background/50 p-2.5 text-left transition-colors",
                  open
                    ? "hover:border-primary/40 hover:bg-popover"
                    : "cursor-not-allowed opacity-50",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-popover-foreground">
                    {c.contact?.name || c.contact?.phone}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {open ? c.contact?.phone : t("windowClosed")}
                  </p>
                </div>
                {sendingTo === c.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
