import type { InvoiceHeader, InvoiceItem } from '../_shared/types.ts'

// ─── Constants ────────────────────────────────────────────────────────────────

const AMOUNT_REGEX = /^-?\d+(\.\d{1,4})?$/
const TOLERANCE    = 0.02  // ±2 paise rounding tolerance

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ValidationError {
  field:    string
  code:     string
  message:  string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  passed:   boolean
  errors:   ValidationError[]
  warnings: ValidationError[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function err(field: string, code: string, message: string): ValidationError {
  return { field, code, message, severity: 'error' }
}

function warn(field: string, code: string, message: string): ValidationError {
  return { field, code, message, severity: 'warning' }
}

// ─── Rule 1 — Required header fields ─────────────────────────────────────────
// currency is moved to soft-warnings: OCR frequently omits it on invoices
// that have only one currency in circulation (domestic vendors, USD-only).
// All other fields that are structurally necessary for downstream processing
// remain hard errors.

function validateRequiredFields(header: InvoiceHeader): ValidationError[] {
  const errors: ValidationError[] = []

  const hardRequired: (keyof InvoiceHeader)[] = [
    'vendor', 'invoice_date', 'net_value', 'total_amount',
  ]

  const softRequired: (keyof InvoiceHeader)[] = [
    'currency',  // warn only — OCR often misses this on domestic invoices
  ]

  for (const field of hardRequired) {
    const val = header[field]
    if (val == null || val === '') {
      errors.push(err(
        field,
        'REQUIRED_FIELD_MISSING',
        `Required field "${field}" is missing or empty.`,
      ))
    }
  }

  for (const field of softRequired) {
    const val = header[field]
    if (val == null || val === '') {
      errors.push(warn(
        field,
        'RECOMMENDED_FIELD_MISSING',
        `Recommended field "${field}" is missing — defaulting to unknown currency.`,
      ))
    }
  }

  return errors
}

// ─── Rule 2 — Amount fields must not contain bad characters ──────────────────

function validateAmountFormat(
  val:       number | null,
  fieldName: string,
): ValidationError | null {
  if (val == null) return null
  const str = String(val)
  if (!AMOUNT_REGEX.test(str)) {
    return err(
      fieldName,
      'INVALID_AMOUNT_FORMAT',
      `${fieldName} contains invalid characters: "${str}"`,
    )
  }
  return null
}

function validateHeaderAmounts(header: InvoiceHeader): ValidationError[] {
  const errors: ValidationError[] = []
  const amountFields: (keyof InvoiceHeader)[] = [
    'net_value', 'tax_amount', 'shipping_charges', 'total_amount',
  ]
  for (const field of amountFields) {
    const e = validateAmountFormat(header[field] as number | null, field)
    if (e) errors.push(e)
  }
  return errors
}

// ─── Rule 3 — total_amount = net_value + tax_amount + shipping_charges ────────

function validateHeaderTotal(header: InvoiceHeader): ValidationError | null {
  const net      = header.net_value        ?? 0
  const tax      = header.tax_amount       ?? 0
  const shipping = header.shipping_charges ?? 0
  const total    = header.total_amount     ?? 0
  const expected = net + tax + shipping

  if (Math.abs(total - expected) > TOLERANCE) {
    return err(
      'total_amount',
      'TOTAL_AMOUNT_MISMATCH',
      `total_amount (${total}) ≠ net_value + tax_amount + shipping_charges (${expected.toFixed(2)}).`,
    )
  }
  return null
}

// ─── Rule 4 — Sum of item net values = header net_value ──────────────────────

function validateItemsNetSum(
  header: InvoiceHeader,
  items:  InvoiceItem[],
): ValidationError | null {
  if (!items.length) return null

  const itemsSum  = items.reduce((sum, item) => sum + (item.net_value ?? 0), 0)
  const headerNet = header.net_value ?? 0

  if (Math.abs(itemsSum - headerNet) > TOLERANCE) {
    return err(
      'net_value',
      'ITEMS_NET_SUM_MISMATCH',
      `Sum of item net values (${itemsSum.toFixed(2)}) ≠ header net_value (${headerNet}).`,
    )
  }
  return null
}

// ─── Rule 5 — Item-level amount format + quantity × unit_price = net_value ───

function validateItems(items: InvoiceItem[]): ValidationError[] {
  const errors: ValidationError[] = []

  items.forEach((item, idx) => {
    const prefix = `items[${idx}]`

    const amountFields: (keyof InvoiceItem)[] = [
      'unit_price', 'net_value', 'tax_amount_1', 'tax_amount_2',
    ]
    for (const field of amountFields) {
      const e = validateAmountFormat(item[field] as number | null, `${prefix}.${field}`)
      if (e) errors.push(e)
    }

    if (
      item.quantity   != null &&
      item.unit_price != null &&
      item.net_value  != null
    ) {
      const expected = item.quantity * item.unit_price
      if (Math.abs(expected - item.net_value) > TOLERANCE) {
        errors.push(err(
          `${prefix}.net_value`,
          'ITEM_NET_VALUE_MISMATCH',
          `Item ${item.item_no ?? idx}: qty × unit_price (${expected.toFixed(2)}) ≠ net_value (${item.net_value}).`,
        ))
      }
    }
  })

  return errors
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function validateInvoice(
  header: InvoiceHeader,
  items:  InvoiceItem[],
): ValidationResult {

  const all: ValidationError[] = [
    ...validateRequiredFields(header),
    ...validateHeaderAmounts(header),
    ...validateItems(items),
  ]

  const totalErr   = validateHeaderTotal(header)
  const itemSumErr = validateItemsNetSum(header, items)
  if (totalErr)   all.push(totalErr)
  if (itemSumErr) all.push(itemSumErr)

  const errors   = all.filter((e) => e.severity === 'error')
  const warnings = all.filter((e) => e.severity === 'warning')

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  }
}
