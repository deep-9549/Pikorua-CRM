"use client"

import { useRef, useState } from "react"
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface ImportError {
  row: number
  reason: string
}

interface ImportResult {
  total: number
  inserted: number
  skipped: number
  errors: ImportError[]
}

export function ImportLeadsDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean
  onClose: () => void
  onImported?: (count: number) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setFile(null)
    setResult(null)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function pickFile(f: File) {
    if (!f.name.match(/\.(xlsx|csv)$/i)) {
      setError("Only .xlsx and .csv files are supported")
      return
    }
    setFile(f)
    setError(null)
    setResult(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) pickFile(f)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) pickFile(f)
    e.target.value = ""
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/import/meta-leads", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.message ?? json?.error ?? "Import failed")
        return
      }
      setResult(json)
      if (json.inserted > 0) onImported?.(json.inserted)
    } catch {
      setError("Upload failed — check your connection and try again")
    } finally {
      setLoading(false)
    }
  }

  function handleDownloadTemplate() {
    window.open("/api/import/template/meta-leads", "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            Import Leads from Excel
          </DialogTitle>
          <DialogDescription>
            Upload a .xlsx or .csv file to bulk-import historical leads. Repeat phone numbers are kept as separate enquiries and grouped under the same client's history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Template download */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg"
            style={{ background: "rgb(194 65 12 / 0.06)", border: "1px solid rgb(194 65 12 / 0.18)" }}>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--color-foreground)" }}>Don't have a template?</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                Download the pre-formatted Excel template with sample data
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5 h-8 text-xs ml-3" onClick={handleDownloadTemplate}>
              <Download className="w-3.5 h-3.5" />
              Template
            </Button>
          </div>

          {/* Drop zone */}
          {!result && (
            <div
              className="relative flex flex-col items-center justify-center gap-3 py-10 rounded-xl cursor-pointer transition-colors"
              style={{
                border: `2px dashed ${dragging ? "var(--color-primary)" : "var(--color-border)"}`,
                background: dragging ? "rgb(194 65 12 / 0.04)" : "transparent",
              }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="w-8 h-8 opacity-40" style={{ color: "var(--color-primary)" }} />
              {file ? (
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>{file.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                    {(file.size / 1024).toFixed(1)} KB — click to change
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
                    Drop your file here or click to browse
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                    .xlsx or .csv, up to 5 MB
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
              style={{ background: "rgb(185 28 28 / 0.10)", color: "var(--color-destructive)", border: "1px solid rgb(185 28 28 / 0.24)" }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Imported", value: result.inserted, good: true },
                  { label: "Skipped", value: result.skipped, good: false },
                  { label: "Errors", value: result.errors.length, good: false },
                ].map(({ label, value, good }) => (
                  <div key={label} className="text-center py-3 rounded-lg"
                    style={{ background: good && value > 0 ? "rgb(21 128 61 / 0.08)" : "var(--color-card)", border: "1px solid var(--color-border)" }}>
                    <p className="text-xl font-bold" style={{ color: good && value > 0 ? "var(--color-success)" : "var(--color-foreground)" }}>
                      {value}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>{label}</p>
                  </div>
                ))}
              </div>

              {result.inserted > 0 && (
                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                  style={{ background: "rgb(21 128 61 / 0.08)", color: "var(--color-success)", border: "1px solid rgb(21 128 61 / 0.18)" }}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {result.inserted} lead{result.inserted !== 1 ? "s" : ""} imported successfully — refresh the leads list to see them.
                </div>
              )}

              {result.skipped > 0 && (
                <p className="text-[11px]" style={{ color: "var(--color-muted-foreground)" }}>
                  {result.skipped} row{result.skipped !== 1 ? "s" : ""} skipped — phone number already exists in the system.
                </p>
              )}

              {result.errors.length > 0 && (
                <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                  <div className="px-3 py-2 text-xs font-medium" style={{ background: "rgb(185 28 28 / 0.06)", color: "var(--color-destructive)" }}>
                    {result.errors.length} row error{result.errors.length !== 1 ? "s" : ""}
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y" style={{ borderColor: "var(--color-border)" }}>
                    {result.errors.map(err => (
                      <div key={err.row} className="flex gap-3 px-3 py-2 text-xs">
                        <span className="shrink-0 font-mono" style={{ color: "var(--color-muted-foreground)" }}>Row {err.row}</span>
                        <span style={{ color: "var(--color-foreground)" }}>{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            {result ? (
              <>
                <Button variant="outline" className="flex-1 h-9" onClick={reset}>
                  Import Another File
                </Button>
                <Button
                  className="flex-1 h-9 gold-gradient font-semibold shadow-gold-sm"
                  style={{ color: "var(--color-primary-foreground)" }}
                  onClick={handleClose}
                >
                  Done
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1 h-9" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-9 gold-gradient font-semibold shadow-gold-sm"
                  style={{ color: "var(--color-primary-foreground)" }}
                  disabled={!file || loading}
                  onClick={handleUpload}
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                    : <><Upload className="w-4 h-4 mr-2" />Upload & Import</>}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
