"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { LanguageSwitcher } from "./language-switcher";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const NAV = [
    { href: "/", label: t.navHome },
    { href: "/about", label: t.navAbout },
    { href: "/events", label: t.navEvents },
    { href: "/transparency", label: t.navTransparency },
    { href: "/verify", label: t.navVerify },
    { href: "/gallery", label: t.navGallery },
    { href: "/videos", label: t.navVideos },
    { href: "/documents", label: t.navDocuments },
    { href: "/announcements", label: t.navNotices },
    { href: "/contact", label: t.navContact },
  ];

  return (
    <header className="border-b-4 border-marigold-500 bg-temple-800 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-4 px-4 py-3 min-w-0">
        <Link href="/" prefetch={false} className="flex items-center gap-2 sm:gap-3 text-white no-underline min-w-0 shrink">
          <span aria-hidden="true" className="text-2xl sm:text-3xl leading-none shrink-0">
            🛕
          </span>
          <span className="min-w-0">
            <span className="block text-base sm:text-lg font-bold leading-tight truncate">{t.siteTitle}</span>
            <span className="block text-xs sm:text-sm text-marigold-100 truncate">{t.villageTrust}</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 md:hidden shrink-0">
          <LanguageSwitcher />
          <button
            type="button"
            className="min-h-11 rounded-lg border border-white/40 px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base"
            aria-expanded={open}
            aria-controls="primary-navigation"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-2">
          <ul className="flex flex-wrap items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-lg px-3 py-2 font-medium text-white no-underline hover:bg-temple-700 ${
                    pathname === item.href ? "bg-temple-900 underline underline-offset-4" : ""
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <LanguageSwitcher className="ml-2" />
          <Link
            href="/admin/login"
            prefetch={false}
            className="inline-flex min-h-9 items-center rounded-lg border border-marigold-400 bg-marigold-500/20 px-3 py-1 text-sm font-semibold text-white no-underline hover:bg-marigold-500 hover:text-temple-900 transition-colors"
          >
            {t.navAdminLogin}
          </Link>
        </nav>
      </div>

      {open ? (
        <nav id="primary-navigation" aria-label="Primary" className="border-t border-white/20 md:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="flex min-h-12 items-center border-b border-white/10 text-white no-underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/admin/login"
                prefetch={false}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center font-bold text-marigold-300 no-underline"
              >
                🔐 {t.navAdminLogin}
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="mt-16 border-t border-sandal-200 bg-sandal-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <h2 className="mb-2 text-lg font-bold text-temple-800">{t.siteTitle}</h2>
          <p className="text-ink-700">{t.footerTransparencyDesc}</p>
        </div>
        <nav aria-label="Transparency">
          <h2 className="mb-2 text-lg font-bold text-temple-800">{t.footerTransparencyHeader}</h2>
          <ul className="space-y-1">
            <li>
              <Link href="/transparency" prefetch={false}>{t.navTransparency}</Link>
            </li>
            <li>
              <Link href="/transparency/donations" prefetch={false}>{t.statDonations}</Link>
            </li>
            <li>
              <Link href="/transparency/expenses" prefetch={false}>{t.statExpenses}</Link>
            </li>
            <li>
              <Link href="/transparency/corrections" prefetch={false}>Corrections register</Link>
            </li>
            <li>
              <Link href="/verify" prefetch={false}>{t.navVerify}</Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Participate">
          <h2 className="mb-2 text-lg font-bold text-temple-800">{t.footerParticipateHeader}</h2>
          <ul className="space-y-1">
            <li>
              <Link href="/events" prefetch={false}>{t.navEvents}</Link>
            </li>
            <li>
              <Link href="/volunteer" prefetch={false}>{t.navVolunteer}</Link>
            </li>
            <li>
              <Link href="/feedback" prefetch={false}>{t.navFeedback}</Link>
            </li>
            <li>
              <Link href="/contact" prefetch={false}>{t.navContact}</Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-sandal-200 py-4 text-center text-sm text-ink-700">
        <p>
          {t.footerTrustRights} ·{" "}
          <Link href="/admin/login" prefetch={false} className="font-semibold text-temple-800 underline" rel="nofollow">
            {t.footerAdminLogin}
          </Link>
        </p>
      </div>
    </footer>
  );
}
