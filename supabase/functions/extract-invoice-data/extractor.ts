import type {
  ExtractionFieldMapping,
  InvoiceHeader,
  InvoiceItem,
} from "../_shared/types.ts";

// ─── Structured logger ────────────────────────────────────────────────────────

function logExtract(event: string, data?: unknown) {
  console.log(
    JSON.stringify({
      level: "INFO",
      module: "extractor",
      event,
      ...(data !== undefined && { data }),
      timestamp: new Date().toISOString(),
    }),
  );
}

function logExtractWarn(event: string, data?: unknown) {
  console.warn(
    JSON.stringify({
      level: "WARN",
      module: "extractor",
      event,
      ...(data !== undefined && { data }),
      timestamp: new Date().toISOString(),
    }),
  );
}

// ─── Type coercions ───────────────────────────────────────────────────────────

function toNumber(val: unknown, field?: string): number | null {
  if (val == null || val === "") {
    if (field) logExtractWarn("COERCE_NULL", { field, input: val, target_type: "number" });
    return null;
  }
  const cleaned = String(val).replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  if (isNaN(n)) {
    logExtractWarn("COERCE_NAN", { field, input: val, cleaned, target_type: "number" });
    return null;
  }
  return n;
}

function toString(val: unknown, field?: string): string | null {
  if (val == null || val === "") {
    if (field) logExtractWarn("COERCE_NULL", { field, input: val, target_type: "string" });
    return null;
  }
  return String(val).replace(/[\r\n]+/g, " ").trim();  
}

function toBoolean(val: unknown, field?: string): boolean | null {
  if (val == null) {
    if (field) logExtractWarn("COERCE_NULL", { field, input: val, target_type: "boolean" });
    return null;
  }
  if (typeof val === "boolean") return val;
  const s = String(val).toLowerCase();
  if (["true", "yes", "1", "y"].includes(s)) return true;
  if (["false", "no", "0", "n"].includes(s)) return false;
  logExtractWarn("COERCE_UNRECOGNISED", { field, input: val, target_type: "boolean" });
  return null;
}

function toDate(val: unknown, field?: string): string | null {
  if (val == null || val === "") {
    if (field) logExtractWarn("COERCE_NULL", { field, input: val, target_type: "date" });
    return null;
  }
  try {
    const d = new Date(String(val));
    if (isNaN(d.getTime())) {
      logExtractWarn("COERCE_INVALID_DATE", { field, input: val, fallback: "null" });
      return null;
    }
    return d.toISOString();
  } catch (err) {
    logExtractWarn("COERCE_DATE_EXCEPTION", {
      field,
      input: val,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function coerce(
  val: unknown,
  dataType: ExtractionFieldMapping["data_type"],
  field: string,
): unknown {
  switch (dataType) {
    case "number":  return toNumber(val, field);
    case "boolean": return toBoolean(val, field);
    case "date":    return toDate(val, field);
    default:        return toString(val, field);
  }
}

// ─── Get nested value from OCR JSON using dot-path ───────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const result = path.split(".").reduce((acc: unknown, key) => {
    if (acc == null || typeof acc !== "object") return null;
    return (acc as Record<string, unknown>)[key] ?? null;
  }, obj);
  if (result == null) logExtractWarn("PATH_MISS", { path });
  return result;
}

// ─── field_name → type key normalisers ───────────────────────────────────────
// Maps DB field_name values that differ from the TS type property names.
// Extend these when new mismatches appear in the mappings table.

const HEADER_FIELD_NAME_MAP: Partial<Record<string, keyof InvoiceHeader>> = {
  purchase_order_number: "po_number",
};

const ITEM_FIELD_NAME_MAP: Partial<Record<string, keyof InvoiceItem>> = {
  description: "material_description",
   material_description: "material_description",  // ← add this
};

function resolveHeaderKey(fieldName: string): keyof InvoiceHeader {
  return HEADER_FIELD_NAME_MAP[fieldName] ?? (fieldName as keyof InvoiceHeader);
}

function resolveItemKey(fieldName: string): keyof InvoiceItem {
  return ITEM_FIELD_NAME_MAP[fieldName] ?? (fieldName as keyof InvoiceItem);
}

// ─── Main extraction function ─────────────────────────────────────────────────

export function extractFields(
  ocrJson: Record<string, unknown>,
  mappings: ExtractionFieldMapping[],
): { header: InvoiceHeader; items: InvoiceItem[] } {

  logExtract("EXTRACT_FIELDS_INPUT", {
    ocr_json_top_level_keys: Object.keys(ocrJson),
    mappings_total: mappings.length,
  });

  // Only skip mappings explicitly disabled (is_active = false).
  // NULL is treated as active — the column defaults to null for existing rows.
  const activeMappings = mappings.filter((m) => m.is_active !== false);

  const skipped = mappings.length - activeMappings.length;
  if (skipped > 0) {
    logExtract("MAPPINGS_INACTIVE_SKIPPED", {
      skipped_count: skipped,
      skipped_fields: mappings
        .filter((m) => m.is_active === false)
        .map((m) => m.field_name),
    });
  }

  const sortedMappings = [...activeMappings].sort(
    (a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity),
  );

  const headerMappings = sortedMappings.filter((m) => m.field_type === "header");
  const itemMappings   = sortedMappings.filter((m) => m.field_type === "item");

  logExtract("MAPPINGS_RESOLVED", {
    total: mappings.length,
    active: activeMappings.length,
    inactive_skipped: skipped,
    header_count: headerMappings.length,
    item_count: itemMappings.length,
  });

  // ── Extract header ────────────────────────────────────────────────────────

  const headerRaw: Partial<InvoiceHeader> = {};

  for (const mapping of headerMappings) {
    const rawVal  = getNestedValue(ocrJson, mapping.ocr_key);
    const coerced = coerce(rawVal, mapping.data_type, mapping.field_name);
    const key     = resolveHeaderKey(mapping.field_name);
    (headerRaw as Record<string, unknown>)[key] = coerced;

    logExtract("HEADER_FIELD_MAPPED", {
      db_field_name: mapping.field_name,
      resolved_key:  key,
      ocr_key:       mapping.ocr_key,
      data_type:     mapping.data_type,
      raw_value:     rawVal,
      coerced_value: coerced,
    });
  }

  const header: InvoiceHeader = {
    invoice_number:   headerRaw.invoice_number   ?? null,
    invoice_date:     headerRaw.invoice_date     ?? null,
    vendor:           headerRaw.vendor           ?? null,
    po_number:        headerRaw.po_number        ?? null,
    payment_terms:    headerRaw.payment_terms    ?? null,
    currency:         headerRaw.currency         ?? null,
    net_value:        headerRaw.net_value        ?? null,
    tax_amount:       headerRaw.tax_amount       ?? null,
    shipping_charges: headerRaw.shipping_charges ?? null,
    total_amount:     headerRaw.total_amount     ?? null,
    created_by:       headerRaw.created_by       ?? null,
    file_name:        headerRaw.file_name        ?? null,
  };

  // ── Extract items ─────────────────────────────────────────────────────────

  const rawItems = (ocrJson.items ?? ocrJson.line_items ?? []) as Record<string, unknown>[];
  const itemsSource = ocrJson.items ? "items" : ocrJson.line_items ? "line_items" : "none";

  logExtract("ITEMS_EXTRACTION_START", {
    source_key:          itemsSource,
    raw_items_count:     Array.isArray(rawItems) ? rawItems.length : "not_array",
    item_mappings_count: itemMappings.length,
  });

  if (!Array.isArray(rawItems)) {
    logExtractWarn("ITEMS_NOT_ARRAY", { source_key: itemsSource, actual_type: typeof rawItems });
  }

  const items: InvoiceItem[] = Array.isArray(rawItems)
    ? rawItems.map((rawItem, idx) => {
        const itemRaw: Partial<InvoiceItem> = {};

        for (const mapping of itemMappings) {
          const rawVal  = getNestedValue(rawItem, mapping.ocr_key);
          const coerced = coerce(rawVal, mapping.data_type, mapping.field_name);
          const key     = resolveItemKey(mapping.field_name);
          (itemRaw as Record<string, unknown>)[key] = coerced;

          logExtract("ITEM_FIELD_MAPPED", {
            item_index:    idx,
            db_field_name: mapping.field_name,
            resolved_key:  key,
            ocr_key:       mapping.ocr_key,
            data_type:     mapping.data_type,
            raw_value:     rawVal,
            coerced_value: coerced,
          });
        }

        const item: InvoiceItem = {
          item_no:              itemRaw.item_no              ?? null,
          material_id:          itemRaw.material_id          ?? null,
          material_description: itemRaw.material_description ?? null,
          quantity:             itemRaw.quantity             ?? null,
          unit_price:           itemRaw.unit_price           ?? null,
          net_value:            itemRaw.net_value            ?? null,
          tax_amount_1:         itemRaw.tax_amount_1         ?? null,
          tax_amount_2:         itemRaw.tax_amount_2         ?? null,
          taxable:              itemRaw.taxable              ?? null,
        };

        // Enforce is_required per item
        const missingRequired = itemMappings
          .filter((m) => m.is_required && item[resolveItemKey(m.field_name)] == null)
          .map((m) => m.field_name);
        if (missingRequired.length > 0) {
          logExtractWarn("REQUIRED_ITEM_FIELDS_MISSING", { item_index: idx, missing_fields: missingRequired });
        }

        const nullFields = Object.entries(item).filter(([, v]) => v == null).map(([k]) => k);
        if (nullFields.length) {
          logExtractWarn("ITEM_NULL_FIELDS", { item_index: idx, null_fields: nullFields });
        }

        logExtract("ITEM_EXTRACTION_COMPLETE", { index: idx, item });
        return item;
      })
    : [];

  // ── Derive header net_value from items when OCR did not capture it ────────
  // OCR frequently captures line-item totals but omits the header subtotal.
  // When header net_value is null and items are present, derive it from the
  // sum of item net values so downstream validation can pass correctly.

  if (header.net_value == null && items.length > 0) {
    const itemsSum = items.reduce((sum, i) => sum + (i.net_value ?? 0), 0);
    if (itemsSum > 0) {
      header.net_value = parseFloat(itemsSum.toFixed(4));
      logExtract("HEADER_NET_VALUE_DERIVED_FROM_ITEMS", {
        derived_value: header.net_value,
        item_count:    items.length,
      });
    }
  }

  // ── Enforce is_required on final header ───────────────────────────────────

  const missingRequiredHeader = headerMappings
    .filter((m) => m.is_required && header[resolveHeaderKey(m.field_name)] == null)
    .map((m) => m.field_name);
  if (missingRequiredHeader.length > 0) {
    logExtractWarn("REQUIRED_HEADER_FIELDS_MISSING", { missing_fields: missingRequiredHeader });
  }

  const nullHeaderFields = Object.entries(header).filter(([, v]) => v == null).map(([k]) => k);
  if (nullHeaderFields.length) {
    logExtractWarn("HEADER_NULL_FIELDS", { null_fields: nullHeaderFields });
  }

  logExtract("HEADER_EXTRACTION_COMPLETE", { header });

  // ── Final summary ─────────────────────────────────────────────────────────

  logExtract("EXTRACT_FIELDS_OUTPUT", {
    header_null_count: Object.values(header).filter((v) => v == null).length,
    header_set_count:  Object.values(header).filter((v) => v != null).length,
    items_count:       items.length,
    items_with_nulls:  items.filter((i) => Object.values(i).some((v) => v == null)).length,
  });

  return { header, items };
}
