import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminSessionProvider } from "@/lib/auth/admin-session";
import { siteUrl } from "@/lib/firebase/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Mana Gudi — Village Temple Trust & Transparency Platform",
    template: "%s · Mana Gudi",
  },
  description:
    "Temple timings, poojas, homams and festivals, with a fully public record of every donation received and every rupee spent.",
  openGraph: {
    type: "website",
    siteName: "Mana Gudi",
    title: "Mana Gudi — Village Temple Trust & Transparency Platform",
    description:
      "Public temple accounts: every donation and expense, verifiable by receipt number.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

import { LanguageProvider } from "@/lib/i18n/context";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Structured data helps search engines describe the temple correctly. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "PlaceOfWorship",
              name: "Mana Gudi",
              description: "Village temple trust with fully public accounts.",
              url: siteUrl(),
            }),
          }}
        />
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <LanguageProvider>
          <AdminSessionProvider>{children}</AdminSessionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
