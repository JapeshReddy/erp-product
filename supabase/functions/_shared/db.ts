import { createClient } from "@supabase/supabase-js";
import type {
  DocumentProcessingRun,
  ExtractionFieldMapping,
  StepStatus,
  ProcessingStep,
} from "./types.ts";

type SupabaseClient = ReturnType<typeof createClient>;

// ─── Fetch processing run ─────────────────────────────────────────────────────

export async function fetchProcessingRun(
  supabase: SupabaseClient,
  processingRunId: string,
): Promise<{ data: DocumentProcessingRun | null; error: unknown }> {
  const { data, error } = await supabase
    .schema("product")
    .from("document_processing_runs")
    .select("*")
    .eq("id", processingRunId)
    .maybeSingle();

  return { data: data as DocumentProcessingRun | null, error };
}

// ─── Update processing run ────────────────────────────────────────────────────

export async function updateProcessingRun(
  supabase: SupabaseClient,
  processingRunId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .schema("product")
    .from("document_processing_runs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", processingRunId);

  if (error) {
    console.error(
      JSON.stringify({
        stage: "UPDATE_PROCESSING_RUN_FAILED",
        error,
        processingRunId,
      }),
    );
  }
}

// ─── Insert step log ──────────────────────────────────────────────────────────

export async function insertStepLog(
  supabase: SupabaseClient,
  params: {
    processingRunId: string;
    step: ProcessingStep;
    status: StepStatus;
    message?: string;
    errorCode?: string;
    errorDetails?: string;
    processingTimeMs?: number;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase
    .schema("product")
    .from("document_processing_run_steps")
    .insert({
      processing_run_id: params.processingRunId,
      step: params.step,
      status: params.status,
      message: params.message ?? null,
      error_code: params.errorCode ?? null,
      error_details: params.errorDetails ?? null,
      processing_time_ms: params.processingTimeMs ?? null,
      metadata: params.metadata ?? null,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error(JSON.stringify({ stage: "INSERT_STEP_LOG_FAILED", error }));
  }
}

// ─── Mark run as failed (update run + insert FAILED step log) ─────────────────

export async function markRunFailed(
  supabase: SupabaseClient,
  processingRunId: string,
  step: ProcessingStep,
  errorMessage: string,
  errorCode?: string,
): Promise<void> {
  await Promise.all([
    updateProcessingRun(supabase, processingRunId, {
      status: "FAILED",
      current_step: step,
      error_message: errorMessage,
    }),
    insertStepLog(supabase, {
      processingRunId,
      step,
      status: "FAILED",
      message: errorMessage,
      errorCode,
    }),
  ]);
}

// ─── Fetch extraction field mappings for a client ────────────────────────────

export async function fetchFieldMappings(
  supabase: SupabaseClient,
  clientId: string,
): Promise<ExtractionFieldMapping[]> {
  const { data, error } = await supabase
    .schema("product")
    .from("extraction_field_mappings")
    .select("*")
    .eq("client_id", clientId);

  if (error || !data) return [];
  return data as ExtractionFieldMapping[];
}


