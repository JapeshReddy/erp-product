// ─── Invoice Header ───────────────────────────────────────────────────────────

export interface InvoiceHeader {
  invoice_number:   string | null
  invoice_date:     string | null
  vendor:           string | null
  po_number:        string | null
  payment_terms:    string | null
  currency:         string | null
  net_value:        number | null
  tax_amount:       number | null
  shipping_charges: number | null
  total_amount:     number | null
  created_by:       string | null
  file_name:        string | null
}

// ─── Invoice Item ─────────────────────────────────────────────────────────────

export interface InvoiceItem {
  item_no:              string | null
  material_id:          string | null
  material_description: string | null
  quantity:             number | null
  unit_price:           number | null
  net_value:            number | null
  tax_amount_1:         number | null
  tax_amount_2:         number | null
  taxable:              boolean | null
}

// ─── Extraction Field Mapping ─────────────────────────────────────────────────

export interface ExtractionFieldMapping {
  id:          string
  client_id:   string
  field_name:  string
  ocr_key:     string
  field_type:  'header' | 'item'
  data_type:   'string' | 'number' | 'date' | 'boolean'
  is_required: boolean
}

// ─── Processing Run ───────────────────────────────────────────────────────────

export interface DocumentProcessingRun {
  id:                   string
  client_id:            string
  status:               string
  current_step:         string
  error_message:        string | null
  sender_email:         string | null
  pdf_s3_bucket:        string | null
  pdf_s3_key:           string | null
  ocr_json_s3_bucket:   string | null
  ocr_json_s3_key:      string | null
  ocr_provider:         string | null
  ocr_confidence_score: number | null
  invoice_id:           string | null
}

// ─── Step Types ───────────────────────────────────────────────────────────────

export type StepStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED'

export type ProcessingStep =
  | 'EMAIL_RECEIVED'
  | 'PDF_EXTRACTED'
  | 'OCR_COMPLETED'
  | 'DATA_EXTRACTION'
  | 'VALIDATION'
  | 'TAX_DISTRIBUTION'
  | 'DB_INSERT'
  | 'COMPLETED'

// ─── EF Request / Response shapes ─────────────────────────────────────────────

export interface ExtractRequest {
  processing_run_id: string
  client_id:         string
  ocr_json:          Record<string, unknown>
}

export interface ValidateRequest {
  processing_run_id: string
  client_id:         string
  header:            InvoiceHeader
  items:             InvoiceItem[]
}

export interface TaxDistributionRequest {
  processing_run_id: string
  client_id:         string
  header:            InvoiceHeader
  items:             InvoiceItem[]
}

export interface DbInsertRequest {
  processing_run_id: string
  client_id:         string
  header:            InvoiceHeader
  items:             InvoiceItem[]
}