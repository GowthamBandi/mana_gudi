import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full min-w-0 max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
