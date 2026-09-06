import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedInternalJob } from '@/lib/integrations/internal-auth'
import { runWhatsAppIntegrationWorker } from '@/lib/integrations/whatsapp/worker'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  if (!isAuthorizedInternalJob(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let limit = 10
  try {
    const body = await request.json() as { limit?: unknown }
    if (typeof body.limit === 'number') limit = body.limit
  } catch {
    // Gövde isteğe bağlıdır; varsayılan küçük batch güvenli davranıştır.
  }

  try {
    const summary = await runWhatsAppIntegrationWorker(createAdminClient(), limit)
    return NextResponse.json({ ok: true, ...summary })
  } catch {
    return NextResponse.json({ error: 'integration_worker_failed' }, { status: 500 })
  }
}
