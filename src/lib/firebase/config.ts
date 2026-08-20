/**
 * Environment-aware Firebase configuration.
 *
 * Nothing here is hard-coded to localhost. The site URL is resolved from the
 * environment so that attaching a custom domain later is a configuration
 * change, not a code change.
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function optional(value: string | undefined, fallback: string): string {
  return value || fallback;
}

export function getFirebaseConfig(): FirebaseConfig {
  return {
    apiKey: optional(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, "AIzaSyAoYEVXuskv2GYQXuyueYHa94RxPWe78rY"),
    authDomain: optional(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, "temple-seva-platform.firebaseapp.com"),
    projectId: optional(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "temple-seva-platform"),
    storageBucket: optional(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, "temple-seva-platform.firebasestorage.app"),
    messagingSenderId: optional(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, "218753917957"),
    appId: optional(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, "1:218753917957:web:51897c179643f096eba86c"),
  };
}

export const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

/** Absolute site URL, used for canonical links, sitemaps and receipt QR codes. */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://temple-seva-platform.web.app";
}

export function verificationUrl(receiptNo: string): string {
  return `${siteUrl()}/verify?ref=${encodeURIComponent(receiptNo)}`;
}
