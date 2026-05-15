import type { InvoiceHeader, InvoiceItem } from '../_shared/types.ts'

const TOLERANCE = 0.02

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DistributionResult {
  items:      InvoiceItem[]
  totalTax1:  number
  totalTax2:  number
  difference: number
}

export interface VerificationResult {
  valid:      boolean
  difference: number
}

// ─── Helper: round to 4 decimal places ───────────────────────────────────────

function round4(val: number): number {
  return parseFloat(val.toFixed(4))
}

// ─── Distribute header tax proportionally across items ────────────────────────
//
// Strategy:
//   - Each item gets a share proportional to its net_value / total net_value
//   - Tax per item is split 50/50 between tax_amount_1 and tax_amount_2
//   - If item already has tax values set, those are preserved as-is
//   - The last item absorbs any rounding remainder so sum always = header tax
//   - If total net is 0, tax is split equally across all items

export function distributeTax(
  header: InvoiceHeader,
  items:  InvoiceItem[]
): DistributionResult {
  if (!items.length) {
    return { items, totalTax1: 0, totalTax2: 0, difference: 0 }
  }

  const totalTax = header.tax_amount ?? 0
  const totalNet = items.reduce((sum, item) => sum + (item.net_value ?? 0), 0)
  const isTaxable = totalTax > 0

  // ── If no tax — zero out tax fields and mark not taxable ──
  if (!isTaxable) {
    const result = items.map(item => ({
      ...item,
      tax_amount_1: item.tax_amount_1 ?? 0,
      tax_amount_2: item.tax_amount_2 ?? 0,
      taxable:      item.taxable      ?? false,
    }))
    return { items: result, totalTax1: 0, totalTax2: 0, difference: 0 }
  }

  let distributedSoFar = 0
  const result: InvoiceItem[] = items.map((item, idx) => {
    const isLast = idx === items.length - 1

    // ── If item already has tax values, preserve them ──
    if (item.tax_amount_1 != null && item.tax_amount_2 != null) {
      distributedSoFar = round4(
        distributedSoFar + (item.tax_amount_1 ?? 0) + (item.tax_amount_2 ?? 0)
      )
      return { ...item, taxable: item.taxable ?? true }
    }

    // ── Calculate this item's share of total tax ──
    let itemTax: number

    if (isLast) {
      // Absorb rounding remainder
      itemTax = round4(totalTax - distributedSoFar)
    } else {
      const share = totalNet > 0
        ? (item.net_value ?? 0) / totalNet
        : 1 / items.length
      itemTax = round4(totalTax * share)
      distributedSoFar = round4(distributedSoFar + itemTax)
    }

    // ── Split item tax 50/50 between tax_amount_1 and tax_amount_2 ──
    const tax1 = round4(itemTax / 2)
    const tax2 = round4(itemTax - tax1)

    return {
      ...item,
      tax_amount_1: tax1,
      tax_amount_2: tax2,
      taxable:      true,
    }
  })

  // ── Calculate totals for logging ──
  const totalTax1 = round4(result.reduce((s, i) => s + (i.tax_amount_1 ?? 0), 0))
  const totalTax2 = round4(result.reduce((s, i) => s + (i.tax_amount_2 ?? 0), 0))
  const distributed = round4(totalTax1 + totalTax2)
  const difference  = round4(Math.abs(totalTax - distributed))

  return { items: result, totalTax1, totalTax2, difference }
}

// ─── Verify distributed tax sum matches header tax ────────────────────────────

export function verifyDistribution(
  header:           InvoiceHeader,
  distributedItems: InvoiceItem[]
): VerificationResult {
  const expected   = header.tax_amount ?? 0
  const actual     = round4(
    distributedItems.reduce(
      (sum, item) => sum + (item.tax_amount_1 ?? 0) + (item.tax_amount_2 ?? 0),
      0
    )
  )
  const difference = round4(Math.abs(expected - actual))

  return {
    valid: difference <= TOLERANCE,
    difference,
  }
}