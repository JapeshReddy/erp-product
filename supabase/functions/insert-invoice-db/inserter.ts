import { createClient } from "@supabase/supabase-js";
import type { InvoiceHeader, InvoiceItem } from "../_shared/types.ts";

type SupabaseClient = ReturnType<typeof createClient>;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InsertResult {
  invoiceId: string | null;
  error: string | null;
}

// ─── Generate invoice ID ──────────────────────────────────────────────────────
// Format: INV-2025-A3X9K

export function generateInvoiceId(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `INV-${year}-${rand}`;
}

// ─── Primary path — RPC transaction ──────────────────────────────────────────
// Calls product.insert_invoice_with_items Postgres function.
// Header + all items inserted in a single atomic transaction.
// If any insert fails, Postgres rolls back everything automatically.

async function insertViaRpc(
  supabase: SupabaseClient,
  invoiceId: string,
  clientId: string,
  processingRunId: string,
  header: InvoiceHeader,
  items: InvoiceItem[],
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .schema("product")
    .rpc("insert_invoice_with_items", {
      p_invoice_id: invoiceId,
      p_client_id: clientId,
      p_processing_run_id: processingRunId,
      p_file_name: header.file_name,
      p_invoice_date: header.invoice_date,
      p_total_amount: header.total_amount,
      p_net_value: header.net_value,
      p_tax_amount: header.tax_amount,
      p_shipping_charges: header.shipping_charges,
      p_currency: header.currency,
      p_vendor: header.vendor,
      p_po_number: header.po_number,
      p_payment_terms: header.payment_terms,
      p_created_by: senderEmail,
      p_approval_status: "PENDING",
      p_items: items,
    });

  if (error) return { success: false, error: JSON.stringify(error) };
  return { success: true, error: null };
}

// ─── Fallback path — manual insert with compensation ─────────────────────────
// Used only when the RPC function is not available.
// Inserts header first, then items.
// If items insert fails, deletes the header (manual rollback).

async function insertWithCompensation(
  supabase: SupabaseClient,
  invoiceId: string,
  clientId: string,
  header: InvoiceHeader,
  items: InvoiceItem[],
): Promise<{ success: boolean; error: string | null }> {
  const now = new Date().toISOString();

  // ── Step 1: Insert header ──
  const { error: headerError } = await supabase
    .schema("product")
    .from("invoice_header")
    .insert({
      id: invoiceId,
      client_id: clientId,
      file_name: header.file_name,
      invoice_date: header.invoice_date,
      total_amount: header.total_amount,
      net_value: header.net_value,
      tax_amount: header.tax_amount,
      shipping_charges: header.shipping_charges,
      currency: header.currency,
      vendor: header.vendor,
      po_number: header.po_number,
      payment_terms: header.payment_terms,
      created_by: senderEmail,
      approval_status: "PENDING",
      created_at: now,
    });

  if (headerError) {
    return {
      success: false,
      error: `Header insert failed: ${JSON.stringify(headerError)}`,
    };
  }

  // ── Step 2: Insert items ──
  if (items.length > 0) {
    const itemRows = items.map((item, idx) => ({
      id: invoiceId, // ← was 'invoice_id'
      client_id: clientId, // ← was missing
      item_no: Number(item.item_no ?? idx + 1), // ← cast to number (column is numeric)
      material_id: item.material_id ?? null,
      material_description: item.material_description ?? null,
      quantity: item.quantity ?? null,
      unit_price: item.unit_price ?? null,
      net_value: item.net_value ?? null,
      tax_amount1: item.tax_amount_1 ?? null, // ← was 'tax_amount_1'
      tax_amount2: item.tax_amount_2 ?? null, // ← was 'tax_amount_2'
      is_taxable: item.taxable ?? null, // ← was 'taxable'
      created_at: now,
    }));

    const { error: itemsError } = await supabase
      .schema("product")
      .from("invoice_item")
      .insert(itemRows);

    if (itemsError) {
      // ── Compensate: delete header since items failed ──
      await supabase
        .schema("product")
        .from("invoice_header")
        .delete()
        .eq("id", invoiceId);

      return {
        success: false,
        error: `Items insert failed (header rolled back): ${JSON.stringify(itemsError)}`,
      };
    }
  }

  return { success: true, error: null };
}

// ─── Main insert function ─────────────────────────────────────────────────────
// Tries RPC first. Falls back to manual insert if RPC is unavailable.

export async function insertInvoiceWithItems(
  supabase: SupabaseClient,
  clientId: string,
  processingRunId: string,
  header: InvoiceHeader,
  items: InvoiceItem[],
   senderEmail:     string | null  
): Promise<InsertResult> {
  const invoiceId = generateInvoiceId();

  // ── Try RPC (atomic transaction) ──
  const rpc = await insertViaRpc(
    supabase,
    invoiceId,
    clientId,
    processingRunId,
    header,
    items,
  );

  if (rpc.success) {
    return { invoiceId, error: null };
  }

  // ── Log RPC failure and try fallback ──
  console.warn(
    JSON.stringify({
      stage: "RPC_UNAVAILABLE_USING_FALLBACK",
      rpcError: rpc.error,
      invoiceId,
    }),
  );

  const fallback = await insertWithCompensation(
    supabase,
    invoiceId,
    clientId,
    header,
    items,
  );

  if (fallback.success) {
    return { invoiceId, error: null };
  }

  return { invoiceId: null, error: fallback.error };
}
