import { createClient }                                            from '@supabase/supabase-js'
import { log, logError }                                           from '../_shared/logger.ts'
import { success, failure, corsPreflightResponse }                 from '../_shared/response.ts'
import {
  updateProcessingRun,
  insertStepLog,
  markRunFailed,
}                                                                  from '../_shared/db.ts'
import type { DbInsertRequest }                                    from '../_shared/types.ts'
import { insertInvoiceWithItems }                                  from './inserter.ts'

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID()

  if (req.method === 'OPTIONS') return corsPreflightResponse()
  if (req.method !== 'POST') {
    return failure('METHOD_NOT_ALLOWED', 'Only POST requests accepted.', undefined, 405)
  }

  // ── Env ──
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return failure('CONFIG_ERROR', 'Missing environment configuration.', undefined, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Parse body ──
  let body: DbInsertRequest
  try {
    body = await req.json()
  } catch {
    return failure('INVALID_JSON', 'Request body must be valid JSON.')
  }

  const { processing_run_id, client_id, header, items,sender_email  } = body

  if (!processing_run_id || !client_id || !header) {
    return failure('INVALID_REQUEST', 'processing_run_id, client_id, and header are required.')
  }

  const startTime = Date.now()
  log(requestId, 'EF4_DB_INSERT_STARTED', {
    processing_run_id,
    client_id,
    items_count:   items?.length ?? 0,
    vendor:        header.vendor,
    total_amount:  header.total_amount,
  })

  // ── Insert invoice header + items ──
  const { invoiceId, error: insertError } = await insertInvoiceWithItems(
    supabase,
    client_id,
    processing_run_id,
    header,
    items ?? [],
     sender_email ?? null
  )

  const processingTimeMs = Date.now() - startTime

  // ── Insert failed — mark run as FAILED, stop processing ──
  if (insertError || !invoiceId) {
    logError(requestId, 'EF4_DB_INSERT_FAILED', insertError, { processing_run_id })

    await markRunFailed(
      supabase,
      processing_run_id,
      'DB_INSERT',
      insertError ?? 'Unknown insert error',
      'DB_INSERT_FAILED'
    )

    return failure(
      'DB_INSERT_FAILED',
      'Failed to insert invoice into database.',
      insertError ?? undefined
    )
  }

  // ── Insert succeeded — mark run as COMPLETED ──
  const now = new Date().toISOString()

  await Promise.all([
    // Update master run record
    updateProcessingRun(supabase, processing_run_id, {
      status:        'COMPLETED',
      current_step:  'COMPLETED',
      invoice_id:    invoiceId,
      completed_at:  now,
      error_message: null,
    }),

    // Log DB_INSERT step
    insertStepLog(supabase, {
      processingRunId:  processing_run_id,
      step:             'DB_INSERT',
      status:           'SUCCESS',
      message:          `Invoice ${invoiceId} inserted with ${items?.length ?? 0} line items.`,
      processingTimeMs,
      metadata: {
        invoice_id:  invoiceId,
        items_count: items?.length ?? 0,
      },
    }),

    // Log COMPLETED step
    insertStepLog(supabase, {
      processingRunId: processing_run_id,
      step:            'COMPLETED',
      status:          'SUCCESS',
      message:         'Invoice processing pipeline completed successfully.',
      metadata: {
        invoice_id: invoiceId,
      },
    }),
  ])

  log(requestId, 'EF4_DB_INSERT_COMPLETE', {
    processing_run_id,
    invoice_id:         invoiceId,
    items_count:        items?.length ?? 0,
    processing_time_ms: processingTimeMs,
  })

  return success('INSERT_SUCCESS', 'Invoice inserted successfully.', {
    processing_run_id,
    invoice_id: invoiceId,
  })
})