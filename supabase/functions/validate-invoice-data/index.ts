import { createClient }                                            from '@supabase/supabase-js'
import { log, logError }                                           from '../_shared/logger.ts'
import { success, failure, corsPreflightResponse }                 from '../_shared/response.ts'
import {
  updateProcessingRun,
  insertStepLog,
  markRunFailed,
}                                                                  from '../_shared/db.ts'
import type { ValidateRequest }                                    from '../_shared/types.ts'
import { validateInvoice }                                         from './validators.ts'

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
  let body: ValidateRequest
  try {
    body = await req.json()
  } catch {
    return failure('INVALID_JSON', 'Request body must be valid JSON.')
  }

  const { processing_run_id, client_id, header, items } = body

  if (!processing_run_id || !client_id || !header) {
    return failure('INVALID_REQUEST', 'processing_run_id, client_id, and header are required.')
  }

  const startTime = performance.now()
  log(requestId, 'EF2_VALIDATION_STARTED', {
    processing_run_id,
    client_id,
    items_count: items?.length ?? 0,
  })

  // ── Run all validation rules ──
  const result = validateInvoice(header, items ?? [])
  const processingTimeMs = Math.round(performance.now() - startTime)

  // ── Validation failed — stop processing ──
  if (!result.passed) {
    const errorSummary = result.errors
      .map(e => `[${e.code}] ${e.message}`)
      .join(' | ')

    logError(requestId, 'EF2_VALIDATION_FAILED', errorSummary, {
      processing_run_id,
      errors_count: result.errors.length,
    })

    await markRunFailed(
      supabase,
      processing_run_id,
      'VALIDATION',
      errorSummary,
      'VALIDATION_FAILED'
    )

    return failure(
      'VALIDATION_FAILED',
      'Invoice validation failed.',
      errorSummary
    )
  }

  // ── Validation passed ──
  await Promise.all([
    updateProcessingRun(supabase, processing_run_id, {
      current_step: 'VALIDATION',
    }),
    insertStepLog(supabase, {
      processingRunId:  processing_run_id,
      step:             'VALIDATION',
      status:           'SUCCESS',
      message:          'All validation checks passed.',
      processingTimeMs,
      metadata: {
        checks_passed:    true,
        items_validated:  items?.length ?? 0,
      },
    }),
  ])

  log(requestId, 'EF2_VALIDATION_COMPLETE', {
    processing_run_id,
    processing_time_ms: processingTimeMs,
  })

  return success('VALIDATION_SUCCESS', 'Invoice data validated successfully.', {
    processing_run_id,
    client_id,
    header,
    items:             items ?? [],
    validation_passed: true,
  })
})