import { supabase } from "@/lib/supabase";
import type {
  InvoiceRow,
  InvoiceItem,
  InvoiceFilters,
  PaginatedInvoices,
} from "@/types/invoice";

// ─── Date range helper ────────────────────────────────────────────────────────

function getDateFrom(filter: InvoiceFilters): string | null {
  const now = new Date();
  if (filter.dateRange === "THIS_MONTH") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  if (filter.dateRange === "LAST_3_MONTHS") {
    return new Date(now.setMonth(now.getMonth() - 3)).toISOString();
  }
  if (filter.dateRange === "LAST_6_MONTHS") {
    return new Date(now.setMonth(now.getMonth() - 6)).toISOString();
  }
  if (filter.dateRange === "CUSTOM" && filter.customFrom) {
    return new Date(filter.customFrom).toISOString();
  }
  return null;
}

// ─── Fetch paginated invoices ─────────────────────────────────────────────────

export async function fetchInvoices(
  clientId: string,
  filters: InvoiceFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedInvoices> {
  let query = supabase
    .schema("product")
    .from("invoice_header")
    .select(
      "id, created_at, file_name, invoice_date, total_amount, net_value, tax_amount, shipping_charges, currency, vendor, po_number, payment_terms, created_by, approval_status, client_id",
      { count: "exact" },
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  console.log(query);

  if (filters.approvalStatus !== "ALL") {
    query = query.eq("approval_status", filters.approvalStatus);
  }
  if (filters.vendor) {
    query = query.ilike("vendor", `%${filters.vendor}%`);
  }
  if (filters.poNumber) {
    query = query.ilike("po_number", `%${filters.poNumber}%`);
  }
  if (filters.currency) {
    query = query.eq("currency", filters.currency);
  }
  if (filters.search) {
    query = query.or(
      `vendor.ilike.%${filters.search}%,po_number.ilike.%${filters.search}%,created_by.ilike.%${filters.search}%`,
    );
  }

  const dateFrom = getDateFrom(filters);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (filters.dateRange === "CUSTOM" && filters.customTo) {
    query = query.lte("created_at", new Date(filters.customTo).toISOString());
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) return { data: [], total: 0 };
  return { data: (data ?? []) as InvoiceRow[], total: count ?? 0 };
}

// ─── Fetch single invoice ─────────────────────────────────────────────────────

export async function fetchInvoiceById(id: string): Promise<InvoiceRow | null> {
  const { data, error } = await supabase
    .schema('product')
  .from('invoice_header')
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as InvoiceRow;
}

// ─── Fetch invoice items ──────────────────────────────────────────────────────

export async function fetchInvoiceItems(
  invoiceId: string,
): Promise<InvoiceItem[]> {
  const { data, error } = await supabase
    .schema('product')
    .from('invoice_item')
    .select("*")
    .eq("id", invoiceId)
    .order("item_no", { ascending: true });

  if (error || !data) return [];
  return data as InvoiceItem[];
}

// ─── Fetch distinct vendors for filter dropdown ───────────────────────────────

export async function fetchVendors(clientId: string): Promise<string[]> {
  const { data, error } = await supabase
    .schema('product')
    .from('invoice_header')
    .select("vendor")
    .eq("client_id", clientId)
    .not("vendor", "is", null);

  if (error || !data) return [];
  return [
    ...new Set(data.map((r: any) => r.vendor).filter(Boolean)),
  ] as string[];
}

// ─── Fetch distinct currencies ────────────────────────────────────────────────

export async function fetchCurrencies(clientId: string): Promise<string[]> {
  const { data, error } = await supabase
    .schema('product')
    .from('invoice_header')
    .select("currency")
    .eq("client_id", clientId)
    .not("currency", "is", null);

  if (error || !data) return [];
  return [
    ...new Set(data.map((r: any) => r.currency).filter(Boolean)),
  ] as string[];
}
