"use client";

import { useState, useRef } from "react";
import { uploadFinancialProof } from "@/lib/services/proof-storage";

interface ProofUploadProps {
  kind: "donations" | "expenses";
  recordId?: string;
  onUploaded: (storagePath: string) => void;
  label?: string;
}

export function ProofUpload({ kind, recordId, onUploaded, label = "Upload Proof (Optional)" }: ProofUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setError(null);
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    setFile(selected);
    if (selected.type.startsWith("image/")) {
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemove = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadedPath(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onUploaded("");
  };

  const handleUpload = async (tempId?: string) => {
    if (!file) return;
    const targetId = recordId || tempId || `temp-${Date.now()}`;
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const res = await uploadFinancialProof(kind, targetId, file, (p) => setProgress(p));
      setUploadedPath(res.path);
      onUploaded(res.path);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-ink-900">{label}</label>

      {!file && !uploadedPath && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
            id={`proof-upload-${kind}`}
          />
          <label
            htmlFor={`proof-upload-${kind}`}
            className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-marigold-300 bg-sandal-50 px-4 py-3 text-center text-sm font-semibold text-temple-800 transition hover:bg-sandal-100 active:scale-[0.99]"
          >
            <span className="text-xl">📷</span>
            <span>Take Photo or Choose Proof File</span>
          </label>
        </div>
      )}

      {file && (
        <div className="rounded-xl border border-sandal-300 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Proof preview"
                  className="h-14 w-14 rounded-lg object-cover border border-sandal-200"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-sandal-100 font-bold text-temple-800">
                  PDF
                </div>
              )}
              <div className="truncate text-xs">
                <p className="truncate font-semibold text-ink-900">{file.name}</p>
                <p className="text-ink-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                {uploadedPath && <p className="font-semibold text-verify-700">✓ Uploaded securely</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!uploadedPath && !uploading && recordId && (
                <button
                  type="button"
                  onClick={() => void handleUpload()}
                  className="min-h-11 rounded-lg bg-temple-800 px-3 text-xs font-medium text-white hover:bg-temple-900"
                >
                  Upload
                </button>
              )}
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="min-h-11 rounded-lg bg-sandal-100 px-3 text-xs font-semibold text-alert-700 hover:bg-sandal-200"
              >
                Remove
              </button>
            </div>
          </div>

          {uploading && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-ink-700">
                <span>Uploading proof...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-sandal-200">
                <div
                  className="h-full bg-marigold-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-alert-50 p-2 text-xs font-medium text-alert-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void handleUpload()}
                className="underline font-bold text-alert-900 ml-2"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
