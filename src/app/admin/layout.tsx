import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminChrome } from "@/components/admin/chrome";

/**
 * The committee portal is explicitly kept out of search results. Public
 * transparency is about the accounts, not about advertising the door to the
 * administration system.
 */
export const metadata: Metadata = {
  title: "Committee portal",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminChrome>{children}</AdminChrome>;
}
