"use client";

import Link from "next/link";
import { HomeDashboard, HomeEvents } from "@/components/home-sections";
import { ButtonLink, Card } from "@/components/ui";
import { useLanguage } from "@/lib/i18n/context";

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <>
      <section className="mb-10 rounded-2xl bg-temple-800 px-6 py-10 text-white md:px-10 md:py-14">
        <p className="mb-2 font-semibold text-marigold-400">{t.tagline}</p>
        <h1 className="max-w-2xl text-3xl font-bold leading-tight md:text-4xl">
          {t.homeHeroHeading}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-sandal-100">
          {t.homeHeroSub}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/transparency"
            prefetch={false}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-marigold-500 px-5 py-2.5 font-semibold text-temple-900 no-underline hover:bg-marigold-400"
          >
            {t.btnSeeFullAccounts}
          </Link>
          <Link
            href="/verify"
            prefetch={false}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/60 px-5 py-2.5 font-semibold text-white no-underline hover:bg-temple-700"
          >
            {t.btnVerifyReceipt}
          </Link>
        </div>
      </section>

      <HomeDashboard />

      <section className="mb-10" aria-labelledby="visiting">
        <h2 id="visiting" className="mb-5 text-2xl font-semibold text-temple-800">
          Visiting the temple
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <h3 className="mb-2 text-lg font-semibold text-temple-700">Darshan timings</h3>
            <dl className="space-y-1 text-ink-700">
              <div className="flex justify-between gap-4">
                <dt>Morning</dt>
                <dd className="amount">6:00 am – 11:30 am</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Evening</dt>
                <dd className="amount">5:00 pm – 8:30 pm</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-ink-500">
              Timings change on festival days. Check the notices page.
            </p>
          </Card>
          <Card>
            <h3 className="mb-2 text-lg font-semibold text-temple-700">Daily poojas</h3>
            <ul className="space-y-1 text-ink-700">
              <li className="flex justify-between gap-4">
                <span>Suprabhatam</span> <span className="amount">6:00 am</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Abhishekam</span> <span className="amount">7:30 am</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Archana</span> <span className="amount">11:00 am</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Deeparadhana</span> <span className="amount">6:30 pm</span>
              </li>
            </ul>
          </Card>
          <Card>
            <h3 className="mb-2 text-lg font-semibold text-temple-700">Reach us</h3>
            <address className="not-italic text-ink-700">
              Temple Street, Village Centre
              <br />
              Andhra Pradesh
            </address>
            <div className="mt-3">
              <ButtonLink href="/contact" variant="secondary">
                Contact details
              </ButtonLink>
            </div>
          </Card>
        </div>
      </section>

      <HomeEvents />

      <section className="rounded-2xl border border-sandal-200 bg-sandal-100 p-6 md:p-8">
        <h2 className="text-2xl font-semibold text-temple-800">Something not right?</h2>
        <p className="mt-2 max-w-2xl text-ink-700">
          If you see an entry in the accounts that looks wrong, or you want to raise a concern
          about how the temple is run, tell the committee. You will get a tracking number and can
          check the status yourself.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink href="/feedback">Raise a complaint or suggestion</ButtonLink>
          <ButtonLink href="/volunteer" variant="secondary">
            Volunteer for seva
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
