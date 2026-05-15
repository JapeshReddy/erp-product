import type { ExtractedFile } from './types.ts'
import { errorResponse } from './response.ts'

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  // 25 MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
]

// PDF magic bytes: %PDF-
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2D]

// ── uint8ArrayToBase64 ────────────────────────────────────────────────────────
// Chunk-safe base64 encoder — avoids argument-limit crash on large files.

export function uint8ArrayToBase64(buffer: Uint8Array): string {

  console.log('[BASE64] Starting conversion')
  console.log('[BASE64] Buffer size:', buffer.length)

  const chunkSize = 8190
  let base64 = ''

  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, i + chunkSize)

    let str = ''

    for (let j = 0; j < chunk.length; j++) {
      str += String.fromCharCode(chunk[j])
    }

    base64 += btoa(str)
  }

  console.log('[BASE64] Conversion completed')
  console.log('[BASE64] Base64 length:', base64.length)

  return base64
}

// ── extractAndValidateFile ────────────────────────────────────────────────────
// Parses the multipart form, validates type + size + magic bytes.
// Returns either the validated file or an error Response.

export async function extractAndValidateFile(
  req: Request
): Promise<{ file: ExtractedFile } | Response> {

  console.log('━━━━━━━━━━━━━━━━━━━━━━')
  console.log('[UPLOAD] Request received')

  // Early size guard before parsing body
  const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10)

  console.log('[UPLOAD] Content-Length:', contentLength)

  if (!isNaN(contentLength) && contentLength > MAX_FILE_SIZE_BYTES) {

    console.error('[UPLOAD] Request exceeds max size')

    return errorResponse(
      'FILE_TOO_LARGE',
      'Request exceeds the 25 MB limit.',
      undefined,
      413
    )
  }

  let formData: FormData

  try {

    console.log('[FORMDATA] Parsing form data')

    formData = await req.formData()

    console.log('[FORMDATA] Parsed successfully')
    console.log('[FORMDATA] Keys:', [...formData.keys()])

  } catch (err) {

    console.error('[FORMDATA] Parse failed:', err)

    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to parse form data.',
      String(err)
    )
  }

  const fileEntry = formData.get('file')

  console.log('[FILE] File exists:', !!fileEntry)

  if (!fileEntry || !(fileEntry instanceof File)) {

    console.error('[FILE] Missing or invalid file')

    return errorResponse(
      'FILE_MISSING',
      "No file found. Expected form field: 'file'."
    )
  }

  console.log('[FILE] Name:', fileEntry.name)
  console.log('[FILE] Type:', fileEntry.type)
  console.log('[FILE] Size:', fileEntry.size)

  if (!ALLOWED_MIME_TYPES.includes(fileEntry.type)) {

    console.error('[FILE] Invalid MIME type:', fileEntry.type)

    return errorResponse(
      'INVALID_FILE_TYPE',
      `Unsupported file type: '${fileEntry.type}'. Allowed: PDF, JPG, PNG.`
    )
  }

  if (fileEntry.size === 0) {

    console.error('[FILE] Empty file')

    return errorResponse(
      'EMPTY_FILE',
      'The uploaded file is empty.'
    )
  }

  if (fileEntry.size > MAX_FILE_SIZE_BYTES) {

    const sizeMB = (fileEntry.size / (1024 * 1024)).toFixed(2)

    console.error('[FILE] File too large:', sizeMB, 'MB')

    return errorResponse(
      'FILE_TOO_LARGE',
      `File size ${sizeMB} MB exceeds the 25 MB limit.`
    )
  }

  let buffer: Uint8Array

  try {

    console.log('[BUFFER] Reading arrayBuffer')

    buffer = new Uint8Array(await fileEntry.arrayBuffer())

    console.log('[BUFFER] Read successful')
    console.log('[BUFFER] Length:', buffer.length)

  } catch (err) {

    console.error('[BUFFER] Read failed:', err)

    return errorResponse(
      'FILE_READ_ERROR',
      'Could not read file buffer.',
      String(err)
    )
  }

  // Magic-byte check for PDFs
  if (fileEntry.type === 'application/pdf') {

    console.log('[PDF] Validating magic bytes')

    const validPdf = PDF_MAGIC.every((byte, i) => buffer[i] === byte)

    console.log('[PDF] Validation result:', validPdf)

    if (!validPdf) {

      console.error('[PDF] Invalid PDF signature')

      return errorResponse(
        'INVALID_FILE_TYPE',
        'File does not appear to be a valid PDF.'
      )
    }
  }

  // Sanitise filename
  let name = (fileEntry.name ?? '')
    .replace(/[/\\]/g, '')
    .replace(/\s+/g, '_')
    .trim()

  if (!name) {
    name = `invoice_${Date.now()}.pdf`
  }

  console.log('[FILE] Final filename:', name)
  console.log('[UPLOAD] Validation successful')
  console.log('━━━━━━━━━━━━━━━━━━━━━━')

  return {
    file: {
      name,
      buffer,
      type: fileEntry.type
    }
  }
}