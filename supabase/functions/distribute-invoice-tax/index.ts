import { createClient }                                            from '@supabase/supabase-js'
import { log, logError }                                           from '../_shared/logger.ts'
import { success, failure, corsPreflightResponse }                 from '../_shared/response.ts'
import {
  updateProcessingRun,
  insertStepLog,
  markRunFailed,
}                                                                  from '../_shared/db.ts'
import type { TaxDistributionRequest }                             from '../_shared/types.ts'
import { distributeTax, verifyDistribution }                       from './tax-distributor.ts'

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
  let body: TaxDistributionRequest
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
  log(requestId, 'EF3_TAX_DISTRIBUTION_STARTED', {
    processing_run_id,
    client_id,
    items_count: items?.length ?? 0,
    header_tax:  header.tax_amount,
    header_net:  header.net_value,
  })

  // ── Distribute tax across items ──
  const { items: distributedItems, totalTax1, totalTax2, difference } =
    distributeTax(header, items ?? [])

  // ── Verify distribution is within tolerance ──
  const { valid } = verifyDistribution(header, distributedItems)

  if (!valid) {
    const errMsg = `Tax distribution verification failed. Expected: ${header.tax_amount}, distributed: ${totalTax1 + totalTax2}, difference: ${difference}`

    logError(requestId, 'EF3_VERIFICATION_FAILED', errMsg, { processing_run_id })

    await markRunFailed(
      supabase,
      processing_run_id,
      'TAX_DISTRIBUTION',
      errMsg,
      'TAX_DISTRIBUTION_VERIFICATION_FAILED'
    )

    return failure('TAX_DISTRIBUTION_FAILED', 'Tax distribution verification failed.', errMsg)
  }

  const processingTimeMs = Math.round(performance.now() - startTime)

  // ── Update run + log step ──
  await Promise.all([
    updateProcessingRun(supabase, processing_run_id, {
      current_step: 'TAX_DISTRIBUTION',
    }),
    insertStepLog(supabase, {
      processingRunId:  processing_run_id,
      step:             'TAX_DISTRIBUTION',
      status:           'SUCCESS',
      message:          `Tax ${header.tax_amount} distributed across ${distributedItems.length} items. tax_1: ${totalTax1}, tax_2: ${totalTax2}.`,
      processingTimeMs,
      metadata: {
        total_tax:       header.tax_amount,
        total_tax1:      totalTax1,
        total_tax2:      totalTax2,
        items_count:     distributedItems.length,
        difference,
      },
    }),
  ])

  log(requestId, 'EF3_TAX_DISTRIBUTION_COMPLETE', {
    processing_run_id,
    items_count:        distributedItems.length,
    total_tax1:         totalTax1,
    total_tax2:         totalTax2,
    difference,
    processing_time_ms: processingTimeMs,
  })

  return success('TAX_DISTRIBUTION_SUCCESS', 'Tax distributed across items successfully.', {
    processing_run_id,
    client_id,
    header,
    items: distributedItems,
  })
})