import { createClient } from "@supabase/supabase-js";
import { log, logError } from "../_shared/logger.ts";
import {
  success,
  failure,
  corsPreflightResponse,
} from "../_shared/response.ts";
import {
  fetchProcessingRun,
  fetchFieldMappings,
  updateProcessingRun,
  insertStepLog,
  markRunFailed,
} from "../_shared/db.ts";
import type { ExtractRequest } from "../_shared/types.ts";
import { extractFields } from "./extractor.ts";

// ── Logger helpers ──────────────────────────────────────────────────────────

function logRequest(requestId: string, req: Request, body: unknown) {
  console.log(JSON.stringify({
    level: "INFO",
    requestId,
    event: "HTTP_REQUEST",
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(
      [...req.headers.entries()].filter(([k]) =>
        ["content-type", "user-agent", "x-forwarded-for", "origin"].includes(k)
      )
    ),
    body,
    timestamp: new Date().toISOString(),
  }));
}

function logResponse(
  requestId: string,
  statusCode: number,
  responseBody: unknown,
  durationMs: number,
) {
  console.log(JSON.stringify({
    level: "INFO",
    requestId,
    event: "HTTP_RESPONSE",
    statusCode,
    durationMs,
    body: responseBody,
    timestamp: new Date().toISOString(),
  }));
}

function logStep(requestId: string, step: string, data?: unknown) {
  console.log(JSON.stringify({
    level: "INFO",
    requestId,
    event: step,
    ...(data !== undefined && { data }),
    timestamp: new Date().toISOString(),
  }));
}

function logStepError(
  requestId: string,
  step: string,
  error: unknown,
  context?: unknown,
) {
  console.error(JSON.stringify({
    level: "ERROR",
    requestId,
    event: step,
    error: error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error,
    ...(context !== undefined && { context }),
    timestamp: new Date().toISOString(),
  }));
}

// ── Wrap Response so we can log before returning ────────────────────────────

async function trackedResponse(
  requestId: string,
  startTime: number,
  res: Response,
): Promise<Response> {
  let bodyPreview: unknown;
  try {
    const cloned = res.clone();
    bodyPreview = await cloned.json();
  } catch {
    bodyPreview = "<non-JSON body>";
  }
  logResponse(requestId, res.status, bodyPreview, Date.now() - startTime);
  return res;
}

// ── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const handlerStart = Date.now();

  // ── CORS preflight ──
  if (req.method === "OPTIONS") {
    logStep(requestId, "CORS_PREFLIGHT");
    return corsPreflightResponse();
  }

  // ── Method guard ──
  if (req.method !== "POST") {
    logStep(requestId, "METHOD_NOT_ALLOWED", { method: req.method });
    const res = failure(
      "METHOD_NOT_ALLOWED",
      "Only POST requests accepted.",
      undefined,
      405,
    );
    return trackedResponse(requestId, handlerStart, res);
  }

  // ── Env ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    logStepError(requestId, "CONFIG_ERROR", "Missing env vars", {
      supabase_url_present: !!supabaseUrl,
      service_role_key_present: !!serviceRoleKey,
    });
    const res = failure(
      "CONFIG_ERROR",
      "Missing environment configuration.",
      undefined,
      500,
    );
    return trackedResponse(requestId, handlerStart, res);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Parse body ──
  let body: ExtractRequest;
  try {
    body = await req.json();
  } catch (err) {
    logStepError(requestId, "INVALID_JSON", err);
    const res = failure("INVALID_JSON", "Request body must be valid JSON.");
    return trackedResponse(requestId, handlerStart, res);
  }

  // Log full incoming request (body parsed)
  logRequest(requestId, req, {
    processing_run_id: body.processing_run_id,
    client_id: body.client_id,
    ocr_json_present: body.ocr_json != null,
    ocr_json_keys: body.ocr_json ? Object.keys(body.ocr_json) : [],
  });

  const { processing_run_id, client_id, ocr_json } = body;

  // ── Required fields guard ──
  if (!processing_run_id || !client_id) {
    logStepError(requestId, "INVALID_REQUEST", "Missing required fields", {
      processing_run_id_present: !!processing_run_id,
      client_id_present: !!client_id,
    });
    const res = failure(
      "INVALID_REQUEST",
      "processing_run_id and client_id are required.",
    );
    return trackedResponse(requestId, handlerStart, res);
  }

  const startTime = Date.now();
  log(requestId, "EF1_EXTRACT_STARTED", { processing_run_id, client_id });

  // ── Fetch processing run ──
  logStep(requestId, "FETCH_PROCESSING_RUN_START", { processing_run_id });
  const { data: run, error: runError } = await fetchProcessingRun(
    supabase,
    processing_run_id,
  );

  if (runError || !run) {
    logStepError(requestId, "PROCESSING_RUN_NOT_FOUND", runError, {
      processing_run_id,
    });
    logError(requestId, "PROCESSING_RUN_NOT_FOUND", runError, {
      processing_run_id,
    });
    const res = failure("RUN_NOT_FOUND", "Processing run not found.");
    return trackedResponse(requestId, handlerStart, res);
  }

  logStep(requestId, "FETCH_PROCESSING_RUN_SUCCESS", {
    processing_run_id,
    current_step: run.current_step,
    ocr_json_s3_bucket: run.ocr_json_s3_bucket,
    ocr_json_s3_key: run.ocr_json_s3_key,
    has_ocr_json: !!(run.ocr_json_s3_bucket && run.ocr_json_s3_key),
  });

  // ── OCR availability guard ──
  if (!run.ocr_json_s3_bucket || !run.ocr_json_s3_key) {
    logStepError(requestId, "OCR_NOT_READY", "OCR JSON not available", {
      processing_run_id,
      ocr_json_s3_bucket: run.ocr_json_s3_bucket,
      ocr_json_s3_key: run.ocr_json_s3_key,
    });
    await markRunFailed(
      supabase,
      processing_run_id,
      "DATA_EXTRACTION",
      "OCR JSON not available.",
      "OCR_NOT_READY",
    );
    const res = failure("OCR_NOT_READY", "OCR JSON is not available for this run.");
    return trackedResponse(requestId, handlerStart, res);
  }

  // ── Fetch OCR JSON from storage ──
  logStep(requestId, "FETCHING_OCR_JSON", {
    bucket: run.ocr_json_s3_bucket,
    key: run.ocr_json_s3_key,
  });
  log(requestId, "FETCHING_OCR_JSON", {
    bucket: run.ocr_json_s3_bucket,
    key: run.ocr_json_s3_key,
  });

  // ── Fetch field mappings ──
  logStep(requestId, "FETCH_FIELD_MAPPINGS_START", { client_id });
  log(requestId, "FETCHING_FIELD_MAPPINGS", { client_id });

  const mappings = await fetchFieldMappings(supabase, client_id);

  logStep(requestId, "FETCH_FIELD_MAPPINGS_RESULT", {
    client_id,
    mappings_count: mappings.length,
    mapping_names: mappings.map((m: { field_name?: string }) => m.field_name).filter(Boolean),
  });

  if (!mappings.length) {
    logStepError(requestId, "NO_MAPPINGS_FOUND", "No field mappings for client", {
      client_id,
    });
    await markRunFailed(
      supabase,
      processing_run_id,
      "DATA_EXTRACTION",
      "No field mappings found for client.",
      "NO_MAPPINGS",
    );
    const res = failure(
      "NO_MAPPINGS",
      "No extraction field mappings found for this client.",
    );
    return trackedResponse(requestId, handlerStart, res);
  }

  // ── Extract header and items ──
  logStep(requestId, "EXTRACTION_START", {
    mappings_count: mappings.length,
    ocr_json_keys: ocr_json ? Object.keys(ocr_json) : [],
  });
  log(requestId, "EXTRACTING_FIELDS", { mappings_count: mappings.length });

  const { header, items } = extractFields(ocr_json, mappings);

  logStep(requestId, "EXTRACTION_COMPLETE", {
    header_fields: Object.keys(header ?? {}),
    items_count: items.length,
    sample_item: items[0] ?? null,
  });

  const processingTimeMs = Date.now() - startTime;

  // ── Update run + log step ──
  logStep(requestId, "DB_UPDATE_START", {
    processing_run_id,
    step: "DATA_EXTRACTION",
  });

  await Promise.all([
    updateProcessingRun(supabase, processing_run_id, {
      current_step: "DATA_EXTRACTION",
    }),
    insertStepLog(supabase, {
      processingRunId: processing_run_id,
      step: "DATA_EXTRACTION",
      status: "SUCCESS",
      message: `Extracted ${items.length} line items.`,
      processingTimeMs,
      metadata: {
        items_count: items.length,
        mappings_count: mappings.length,
      },
    }),
  ]);

  logStep(requestId, "DB_UPDATE_COMPLETE", { processing_run_id });

  log(requestId, "EF1_EXTRACT_COMPLETE", {
    processing_run_id,
    items_count: items.length,
    processing_time_ms: processingTimeMs,
  });

  const res = success(
    "EXTRACTION_SUCCESS",
    "Invoice data extracted successfully.",
    {
      processing_run_id,
      client_id,
      header,
      items,
    },
  );

  return trackedResponse(requestId, handlerStart, res);
});