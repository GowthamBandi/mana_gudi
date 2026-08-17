"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events & Poojas" },
  { href: "/transparency", label: "Transparency" },
  { href: "/verify", label: "Verify Receipt" },
  { href: "/announcements", label: "Notices" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b-4 border-marigold-500 bg-temple-800 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3 text-white no-underline">
          <span aria-hidden="true" className="text-3xl leading-none">
            🛕
          </span>
          <span>
            <span className="block text-lg font-bold leading-tight">Sri Temple Seva</span>
            <span className="block text-sm text-marigold-100">Village Temple Trust</span>
          </span>
        </Link>

        <button
          type="button"
          className="min-h-11 rounded-lg border border-white/40 px-4 py-2 font-semibold md:hidden"
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex flex-wrap items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
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
        </nav>
      </div>

      {open ? (
        <nav id="primary-navigation" aria-label="Primary" className="border-t border-white/20 md:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="flex min-h-12 items-center border-b border-white/10 text-white no-underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-sandal-200 bg-sandal-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <h2 className="mb-2 text-lg font-bold text-temple-800">Sri Temple Seva</h2>
          <p className="text-ink-700">
            Every rupee received and every rupee spent is published here for the whole village to
            see.
          </p>
        </div>
        <nav aria-label="Footer">
          <h2 className="mb-2 text-lg font-bold text-temple-800">Transparency</h2>
          <ul className="space-y-1">
            <li>
              <Link href="/transparency">Financial dashboard</Link>
            </li>
            <li>
              <Link href="/transparency/donations">All donations</Link>
            </li>
            <li>
              <Link href="/transparency/expenses">All expenses</Link>
            </li>
            <li>
              <Link href="/transparency/corrections">Corrections register</Link>
            </li>
            <li>
              <Link href="/verify">Verify a receipt</Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Participate">
          <h2 className="mb-2 text-lg font-bold text-temple-800">Take part</h2>
          <ul className="space-y-1">
            <li>
              <Link href="/events">Events, poojas and homams</Link>
            </li>
            <li>
              <Link href="/volunteer">Volunteer</Link>
            </li>
            <li>
              <Link href="/feedback">Complaints and suggestions</Link>
            </li>
            <li>
              <Link href="/contact">Contact the committee</Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-sandal-200 py-4 text-center text-sm text-ink-700">
        <p>
          Temple committee records ·{" "}
          <Link href="/admin/login" className="text-ink-700" rel="nofollow">
            Committee login
          </Link>
        </p>
      </div>
    </footer>
  );
}
