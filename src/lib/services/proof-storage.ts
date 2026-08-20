"use client";

import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

export interface ProofUploadResult {
  path: string;
  downloadUrl: string;
}

export async function uploadFinancialProof(
  kind: "donations" | "expenses",
  recordId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<ProofUploadResult> {
  // Validate file size (10 MB limit)
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Proof file size must be less than 10MB");
  }

  // Validate mime type (images & PDFs)
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Invalid file type. Please upload a JPEG, PNG, WebP image or PDF receipt.");
  }

  const fileId = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const storagePath = `proofs/${kind}/${recordId}/${fileId}`;
  const storageRef = ref(storage(), storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(progress);
      },
      (error) => {
        reject(new Error(`Proof upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ path: storagePath, downloadUrl });
        } catch {
          reject(new Error("Proof upload completed but failed to resolve URL."));
        }
      }
    );
  });
}
