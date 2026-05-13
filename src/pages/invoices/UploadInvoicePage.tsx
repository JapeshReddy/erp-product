import React, { useState, useRef, useCallback } from 'react'
import {
  Upload, FileText, Image, X, CheckCircle,
  AlertTriangle, Camera, RotateCcw, ArrowRight,
  Eye, Shield, ChevronRight,
} from 'lucide-react'
import '@/styles/_invoices.scss'

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadStage = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

interface UploadedFile {
  file: File
  preview: string | null
  id: string
}

type ValidationError = 'size' | 'format' | 'duplicate' | null

const ACCEPTED_FORMATS = ['application/pdf', 'image/jpeg', 'image/png']
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
const MAX_SIZE_MB = 10

function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function validateFile(file: File, existing: UploadedFile[]): ValidationError {
  if (!ACCEPTED_FORMATS.includes(file.type)) return 'format'
  if (file.size > MAX_SIZE_MB * 1_048_576) return 'size'
  if (existing.some(f => f.file.name === file.name && f.file.size === file.size)) return 'duplicate'
  return null
}

// ─── Validation Banner ────────────────────────────────────────────────────────

const ValidationBanner: React.FC<{ error: ValidationError; onDismiss: () => void }> = ({ error, onDismiss }) => {
  if (!error) return null
  const msgs: Record<NonNullable<ValidationError>, string> = {
    size:      `File exceeds ${MAX_SIZE_MB} MB limit. Please upload a smaller file.`,
    format:    'Unsupported format. Please upload PDF, JPG, or PNG only.',
    duplicate: 'This file has already been added.',
  }
  return (
    <div className="inv-validation-banner">
      <AlertTriangle size={15} />
      <span>{msgs[error]}</span>
      <button onClick={onDismiss}><X size={13} /></button>
    </div>
  )
}

// ─── File Card ────────────────────────────────────────────────────────────────

const FileCard: React.FC<{
  item: UploadedFile
  onRemove: (id: string) => void
  stage: UploadStage
  progress: number
}> = ({ item, onRemove, stage, progress }) => {
  const isPdf = item.file.type === 'application/pdf'

  return (
    <div className="inv-file-card">
      <div className="inv-file-thumb">
        {isPdf ? (
          <div className="inv-file-pdf-icon"><FileText size={24} /></div>
        ) : item.preview ? (
          <img src={item.preview} alt={item.file.name} />
        ) : (
          <div className="inv-file-pdf-icon"><Image size={24} /></div>
        )}
      </div>

      <div className="inv-file-info">
        <div className="inv-file-name">{item.file.name}</div>
        <div className="inv-file-meta">
          {isPdf ? 'PDF Document' : 'Image'} · {formatSize(item.file.size)}
        </div>

        {stage === 'uploading' && (
          <div className="inv-progress-wrap">
            <div className="inv-progress-bar">
              <div className="inv-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="inv-progress-pct">{progress}%</span>
          </div>
        )}
        {stage === 'processing' && (
          <div className="inv-file-status status-processing">
            <span className="inv-spinner-sm" /> Extracting invoice data…
          </div>
        )}
        {stage === 'done' && (
          <div className="inv-file-status status-done">
            <CheckCircle size={13} /> Uploaded successfully
          </div>
        )}
        {stage === 'error' && (
          <div className="inv-file-status status-error">
            <AlertTriangle size={13} /> Upload failed — please retry
          </div>
        )}
      </div>

      {stage === 'idle' && (
        <button className="inv-file-remove" onClick={() => onRemove(item.id)} aria-label="Remove">
          <X size={15} />
        </button>
      )}
    </div>
  )
}

// ─── Camera Modal ─────────────────────────────────────────────────────────────

const CameraModal: React.FC<{ onClose: () => void; onCapture: (file: File) => void }> = ({ onClose, onCapture }) => {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [started,  setStarted]  = useState(false)
  const [captured, setCaptured] = useState<string | null>(null)
  const [camError, setCamError] = useState<string | null>(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      setStarted(true)
    } catch {
      setCamError('Camera access denied or unavailable on this device.')
    }
  }

  const stopCamera = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null }

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    canvasRef.current.width  = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0)
    setCaptured(canvasRef.current.toDataURL('image/jpeg', 0.92))
    stopCamera()
  }

  const retake = async () => { setCaptured(null); await startCamera() }

  const useCapture = () => {
    if (!captured || !canvasRef.current) return
    canvasRef.current.toBlob(blob => {
      if (!blob) return
      onCapture(new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      onClose()
    }, 'image/jpeg', 0.92)
  }

  const handleClose = () => { stopCamera(); onClose() }

  return (
    <div className="inv-camera-overlay" onClick={handleClose}>
      <div className="inv-camera-modal" onClick={e => e.stopPropagation()}>
        <div className="inv-camera-header">
          <span>Scan Invoice</span>
          <button onClick={handleClose}><X size={18} /></button>
        </div>

        <div className="inv-camera-body">
          {camError ? (
            <div className="inv-camera-error">
              <AlertTriangle size={36} />
              <p>{camError}</p>
            </div>
          ) : !started && !captured ? (
            <div className="inv-camera-start">
              <Camera size={52} />
              <p>Position your invoice in good lighting then click Start Camera.</p>
              <button className="erp-btn btn-primary" onClick={startCamera}>
                <Camera size={15} /> Start Camera
              </button>
            </div>
          ) : captured ? (
            <div className="inv-camera-preview"><img src={captured} alt="Captured invoice" /></div>
          ) : (
            <div className="inv-camera-live">
              <video ref={videoRef} className="inv-camera-video" autoPlay playsInline muted />
              <div className="inv-camera-frame" />
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <div className="inv-camera-footer">
          {started && !captured && (
            <button className="erp-btn btn-primary" onClick={capture}>
              <Camera size={15} /> Capture
            </button>
          )}
          {captured && (
            <>
              <button className="erp-btn btn-ghost" onClick={retake}>
                <RotateCcw size={15} /> Retake
              </button>
              <button className="erp-btn btn-primary" onClick={useCapture}>
                <CheckCircle size={15} /> Use This Scan
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const UploadInvoicePage: React.FC = () => {
  const [files,           setFiles]           = useState<UploadedFile[]>([])
  const [stage,           setStage]           = useState<UploadStage>('idle')
  const [progress,        setProgress]        = useState(0)
  const [validationError, setValidationError] = useState<ValidationError>(null)
  const [isDragging,      setIsDragging]      = useState(false)
  const [showCamera,      setShowCamera]      = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFile = (file: File) => {
    const err = validateFile(file, files)
    if (err) { setValidationError(err); return }
    setValidationError(null)
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setFiles(prev => [...prev, { file, preview, id: `${Date.now()}-${Math.random()}` }])
  }

  const removeFile = (id: string) => {
    setFiles(prev => {
      prev.find(f => f.id === id)?.preview && URL.revokeObjectURL(prev.find(f => f.id === id)!.preview!)
      return prev.filter(f => f.id !== id)
    })
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    Array.from(e.dataTransfer.files).forEach(addFile)
  }, [files])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(addFile)
    e.target.value = ''
  }

  const simulateUpload = async () => {
    if (!files.length) return
    setStage('uploading'); setProgress(0)
    for (let p = 0; p <= 100; p += 10) {
      await new Promise(r => setTimeout(r, 120))
      setProgress(p)
    }
    setStage('processing')
    await new Promise(r => setTimeout(r, 1800))
    setStage('done')
  }

  const reset = () => {
    files.forEach(f => f.preview && URL.revokeObjectURL(f.preview))
    setFiles([]); setStage('idle'); setProgress(0); setValidationError(null)
  }

  return (
    <div className="inv-page">
      <div className="inv-container">

        {/* Page Header */}
        <div className="inv-page-header">
          <div className="inv-breadcrumb">
            <span>Invoices</span>
            <ChevronRight size={12} className="inv-breadcrumb-sep" />
            <span className="inv-breadcrumb-current">Upload Invoice</span>
          </div>
          <h1>Upload Invoice</h1>
          <p>Upload PDF or image invoices for automated data extraction and approval workflow routing.</p>
        </div>

        {/* Main Layout */}
        <div className="inv-upload-layout">

          {/* ── Left: Upload Card ── */}
          <div className="inv-upload-main">
            <div className="inv-upload-card">
              <div className="inv-upload-card-header">
                <h2 className="inv-upload-card-title">Upload Invoice File</h2>
                <span className="inv-upload-card-badge">PDF · JPG · PNG</span>
              </div>

              <div className="inv-upload-card-body">
                <ValidationBanner error={validationError} onDismiss={() => setValidationError(null)} />

                {/* Drop Zone */}
                {stage === 'idle' && (
                  <div
                    className={`inv-dropzone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                  >
                    <div className="inv-dropzone-icon-wrap">
                      <Upload size={30} />
                    </div>
                    <div className="inv-dropzone-title">
                      {isDragging ? 'Drop files here' : 'Drag & drop invoices here'}
                    </div>
                    <div className="inv-dropzone-sub">
                      or click anywhere to browse files
                    </div>
                    <div className="inv-dropzone-format-pills">
                      <span className="inv-format-pill">PDF</span>
                      <span className="inv-format-pill">JPG</span>
                      <span className="inv-format-pill">PNG</span>
                    </div>
                    <div className="inv-dropzone-limit">Maximum file size: {MAX_SIZE_MB} MB per file</div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_EXTENSIONS.join(',')}
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFileInput}
                    />
                  </div>
                )}

                {/* Camera scan */}
                {stage === 'idle' && (
                  <>
                    <div className="inv-scan-divider"><span>or scan with camera</span></div>
                    <button className="inv-scan-btn" onClick={() => setShowCamera(true)}>
                      <Camera size={16} />
                      Scan Invoice with Camera
                    </button>
                  </>
                )}

                {/* File Cards */}
                {files.length > 0 && (
                  <div className="inv-files-list">
                    {files.map(item => (
                      <FileCard
                        key={item.id}
                        item={item}
                        onRemove={removeFile}
                        stage={stage}
                        progress={progress}
                      />
                    ))}
                  </div>
                )}

                {files.length > 0 && stage === 'idle' && (
                  <button className="inv-add-more" onClick={() => fileInputRef.current?.click()}>
                    + Add another file
                  </button>
                )}

                {/* Action Buttons */}
                <div className="inv-action-row">
                  {stage === 'idle' && files.length > 0 && (
                    <>
                      <button className="erp-btn btn-ghost" onClick={reset}>
                        <X size={15} /> Clear All
                      </button>
                      <button className="erp-btn btn-primary" onClick={simulateUpload}>
                        <Upload size={15} />
                        Upload {files.length} File{files.length > 1 ? 's' : ''}
                      </button>
                    </>
                  )}
                  {stage === 'done' && (
                    <>
                      <button className="erp-btn btn-ghost" onClick={reset}>
                        <RotateCcw size={15} /> Upload More
                      </button>
                      <button className="erp-btn btn-primary">
                        <Eye size={15} /> View Invoice
                      </button>
                      <button
                        className="erp-btn btn-primary"
                        style={{ background: 'var(--erp-success)', borderColor: 'var(--erp-success)' }}
                      >
                        <ArrowRight size={15} /> Submit for Approval
                      </button>
                    </>
                  )}
                  {stage === 'error' && (
                    <button className="erp-btn btn-primary" onClick={simulateUpload}>
                      <RotateCcw size={15} /> Retry Upload
                    </button>
                  )}
                </div>

                {/* Done Banner */}
                {stage === 'done' && (
                  <div className="inv-done-banner">
                    <CheckCircle size={20} />
                    <div>
                      <div className="inv-done-title">Invoice uploaded successfully</div>
                      <div className="inv-done-sub">Data extraction complete. Ready for approval workflow routing.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="inv-upload-card-footer">
                <span style={{ fontSize: '0.75rem', color: 'var(--erp-text-muted)' }}>
                  All uploads are encrypted and stored securely.
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--erp-text-muted)' }}>
                  <Shield size={13} /> Enterprise-grade security
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Aside ── */}
          <div className="inv-upload-aside">
            <div className="inv-aside">

              {/* Upload Guidelines */}
              <div className="inv-aside-card">
                <div className="inv-aside-title">Upload Guidelines</div>
                <ul className="inv-guideline-list">
                  <li><CheckCircle size={13} /> PDF, JPG, PNG formats supported</li>
                  <li><CheckCircle size={13} /> Maximum {MAX_SIZE_MB} MB per file</li>
                  <li><CheckCircle size={13} /> Clear, readable scans only</li>
                  <li><CheckCircle size={13} /> One invoice per file</li>
                  <li><CheckCircle size={13} /> Avoid blurry or cropped images</li>
                </ul>
              </div>

              {/* Workflow Steps */}
              <div className="inv-aside-card">
                <div className="inv-aside-title">What Happens Next</div>
                <div className="inv-steps">
                  <div className="inv-step">
                    <div className="inv-step-num">1</div>
                    <div>
                      <div className="inv-step-label">Upload & Extract</div>
                      <div className="inv-step-sub">Invoice data extracted automatically</div>
                    </div>
                  </div>
                  <div className="inv-step">
                    <div className="inv-step-num">2</div>
                    <div>
                      <div className="inv-step-label">Review & Validate</div>
                      <div className="inv-step-sub">Review extracted fields before submission</div>
                    </div>
                  </div>
                  <div className="inv-step">
                    <div className="inv-step-num">3</div>
                    <div>
                      <div className="inv-step-label">Submit for Approval</div>
                      <div className="inv-step-sub">Routed to approval queue automatically</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="inv-aside-card">
                <div className="inv-aside-title">Security</div>
                <div className="inv-security-notice">
                  <Shield size={14} />
                  <p>All invoice files are encrypted in transit and at rest using AES-256 encryption.</p>
                </div>
              </div>

              {/* Mobile Tip */}
              <div className="inv-aside-card inv-mobile-tip">
                <div className="inv-aside-title">📱 Mobile Tip</div>
                <p>On mobile, tap the upload area to open your file gallery or camera. Direct camera capture gives the best scan quality.</p>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <CameraModal onClose={() => setShowCamera(false)} onCapture={f => addFile(f)} />
      )}
    </div>
  )
}

export default UploadInvoicePage
