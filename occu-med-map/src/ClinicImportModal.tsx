import { useRef, useState } from "react";
import * as XLSX from "xlsx";

export type MyClinicProvider = {
  source_id?: string | null;
  name?: string;
  clinic_name?: string;
  address_1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  website?: string | null;
  lat?: number;
  lng?: number;
  data_source?: string;
  source_type?: string | null;
};

type ImportResult = {
  batchId: number;
  detectedColumns: string[];
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; name?: string; reason: string }>;
};

type Props = {
  open: boolean;
  providers: MyClinicProvider[];
  onClose: () => void;
  onImported: () => Promise<void>;
};

export default function ClinicImportModal({ open, providers, onClose, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  if (!open) return null;

  async function selectFile(selected: File | null) {
    setFile(selected);
    setResult(null);
    setError("");
    setColumns([]);
    setPreviewCount(0);
    if (!selected) return;
    try {
      const workbook = XLSX.read(await selected.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      setColumns(rows[0] ? Object.keys(rows[0]) : []);
      setPreviewCount(rows.length);
      if (!rows.length) setError("The selected file contains no clinic rows.");
    } catch {
      setError("The selected spreadsheet could not be read.");
    }
  }

  async function importClinics() {
    if (!file || previewCount === 0) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("batchName", batchName.trim());
      const response = await fetch("/api/clinic-import/upload", { method: "POST", body });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || `Import failed with status ${response.status}`);
      setResult(data as ImportResult);
      await onImported();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Clinic import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="workflow-backdrop" onClick={onClose}>
      <section className="workflow-modal clinic-import-modal" onClick={(event) => event.stopPropagation()}>
        <header className="workflow-modal-header">
          <div>
            <span className="workflow-eyebrow">Database-backed provider layer</span>
            <h2>Upload Clinics</h2>
            <p>Review spreadsheet columns, then import normalized clinic records into Neon.</p>
          </div>
          <button className="workflow-close" onClick={onClose} aria-label="Close clinic upload">Close</button>
        </header>

        <div className="workflow-modal-body">
          <div className="workflow-grid two-column">
            <div className="workflow-card">
              <span className="workflow-step">1 · Select and review</span>
              <label className="workflow-field">
                <span>Batch name</span>
                <input value={batchName} onChange={(event) => setBatchName(event.target.value)} placeholder="Optional import label" />
              </label>
              <button className="workflow-primary" disabled={loading} onClick={() => inputRef.current?.click()}>
                Choose Excel or CSV
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.csv"
                hidden
                onChange={(event) => void selectFile(event.target.files?.[0] || null)}
              />
              {file && <div className="workflow-file"><strong>{file.name}</strong><span>{previewCount} data rows detected</span></div>}
              {columns.length > 0 && (
                <div className="workflow-columns">
                  <span>Detected columns</span>
                  <div>{columns.map((column) => <em key={column}>{column}</em>)}</div>
                </div>
              )}
            </div>

            <div className="workflow-card">
              <span className="workflow-step">2 · Persist and refresh</span>
              <p>Valid coordinates are preserved. Missing coordinates are geocoded server-side. Every skipped row is reported.</p>
              <button className="workflow-primary import" disabled={!file || previewCount === 0 || loading} onClick={() => void importClinics()}>
                {loading ? "Importing to Neon…" : "Import to Neon"}
              </button>
              {error && <div className="workflow-alert error">{error}</div>}
              {result && (
                <div className="workflow-result">
                  <strong>Batch #{result.batchId} completed</strong>
                  <div className="workflow-stats">
                    <span><b>{result.inserted}</b> inserted</span>
                    <span><b>{result.updated}</b> updated</span>
                    <span><b>{result.skipped}</b> skipped</span>
                    <span><b>{result.failed}</b> failed</span>
                  </div>
                  {result.errors.length > 0 && (
                    <details>
                      <summary>Review {result.errors.length} row issue{result.errors.length === 1 ? "" : "s"}</summary>
                      <div className="workflow-errors">
                        {result.errors.slice(0, 50).map((rowError) => (
                          <div key={`${rowError.row}-${rowError.reason}`}>Row {rowError.row}{rowError.name ? ` · ${rowError.name}` : ""}: {rowError.reason}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="workflow-card imported-clinics-card">
            <div className="workflow-card-heading">
              <div><span className="workflow-step">My Clinics layer</span><h3>{providers.length} mapped clinics</h3></div>
              <button className="workflow-secondary" onClick={() => void onImported()}>Refresh layer</button>
            </div>
            {providers.length === 0 ? (
              <div className="workflow-empty">No persisted clinics yet. Import a spreadsheet to create the layer.</div>
            ) : (
              <div className="workflow-provider-list">
                {providers.slice(0, 100).map((provider, index) => (
                  <div key={provider.source_id || `${provider.name}-${index}`}>
                    <strong>{provider.name || provider.clinic_name || "Unnamed clinic"}</strong>
                    <span>{[provider.address_1, provider.city, provider.state, provider.zip].filter(Boolean).join(", ")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
