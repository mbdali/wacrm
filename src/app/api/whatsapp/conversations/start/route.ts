import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'
import { resolveConversationByPhone } from '@/lib/whatsapp/resolve-conversation'
import { SendMessageError } from '@/lib/whatsapp/send-message'
import { toDialablePhone } from '@/lib/whatsapp/phone-utils'
import { getT } from '@/lib/i18n/translate'

const t = getT('Api')

// Start (or reopen) a chat with a phone number from the inbox — typed into
// the conversation search or clicked inside a message — without adding a
// contact first. Finds-or-creates the contact and its conversation with the
// same helper the public API uses for `to: <phone>`, so a number started
// here and one that later messages in converge on one thread.
//
// Nothing is sent: a brand-new number has no 24h window, so the agent
// opens the thread and sends an approved template from there.
export async function POST(request: Request) {
  try {
    // Creating contacts + conversations needs the 'agent' role, matching
    // the contacts_insert / conversations_insert RLS policies.
    const { supabase, accountId, userId } = await requireRole('agent')

    const limit = checkRateLimit(`start-chat:${userId}`, RATE_LIMITS.send)
    if (!limit.success) {
      return rateLimitResponse(limit)
    }

    const body = await request.json().catch(() => null)
    const phone = toDialablePhone(
      typeof body?.phone === 'string' ? body.phone : null
    )
    if (!phone) {
      return NextResponse.json(
        { error: t('startChat.invalidPhone') },
        { status: 400 }
      )
    }

    try {
      const resolved = await resolveConversationByPhone(
        supabase,
        accountId,
        phone
      )
      return NextResponse.json({
        conversation_id: resolved.conversationId,
        contact_created: resolved.contactCreated,
      })
    } catch (err) {
      if (err instanceof SendMessageError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      throw err
    }
  } catch (error) {
    console.error('Error in start-chat POST:', error)
    return toErrorResponse(error)
  }
}
