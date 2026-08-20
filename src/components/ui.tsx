/**
 * Shared UI primitives.
 *
 * Deliberately small and semantic. Every interactive element renders as a real
 * <button> or <a> so that keyboard and screen-reader behaviour comes for free
 * rather than being reimplemented with div handlers.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { formatPaise } from "@/lib/domain/money";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-sandal-200 bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(74,16,16,0.06)] min-w-0 max-w-full break-words ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  level = 2,
}: {
  title: string;
  description?: string;
  level?: 2 | 3;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <div className="mb-5">
      <Tag className={`font-semibold text-temple-800 ${level === 2 ? "text-2xl" : "text-xl"}`}>
        {title}
      </Tag>
      {description ? <p className="mt-1 text-ink-700">{description}</p> : null}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "quiet";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-temple-700 text-white hover:bg-temple-800",
  secondary: "bg-white text-temple-800 border border-temple-700 hover:bg-sandal-100",
  danger: "bg-alert-700 text-white hover:brightness-110",
  quiet: "bg-transparent text-temple-800 underline hover:text-temple-600",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "small";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const sizeStyle = size === "sm" || size === "small" ? "min-h-9 px-3 py-1.5 text-sm" : "min-h-11 px-5 py-2.5";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${sizeStyle} ${BUTTON_STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-2.5 font-semibold transition ${BUTTON_STYLES[variant]}`}
    >
      {children}
    </Link>
  );
}

/**
 * Status pill.
 *
 * Colour is never the only signal — the label always spells the status out, so
 * it survives greyscale printing and colour-blind readers.
 */
export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "PUBLISHED" || status === "VERIFIED" || status === "CONFIRMED"
      ? "bg-verify-100 text-verify-700"
      : status === "REJECTED" || status === "REVERSED" || status === "CANCELLED"
        ? "bg-alert-100 text-alert-700"
        : "bg-marigold-100 text-marigold-600";

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${tone}`}>
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}

export function Amount({ paise, className = "" }: { paise: number; className?: string }) {
  return <span className={`amount font-semibold ${className}`}>{formatPaise(paise)}</span>;
}

/** Consistent empty state — tells the reader what they would see and why. */
export function EmptyState({
  title,
  hint,
  description,
}: {
  title: string;
  hint?: string;
  description?: string;
}) {
  const sub = hint || description;
  return (
    <div className="rounded-xl border border-dashed border-sandal-300 bg-sandal-50 p-8 text-center">
      <p className="font-semibold text-ink-700">{title}</p>
      {sub ? <p className="mt-1 text-sm text-ink-500">{sub}</p> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl border border-alert-700/30 bg-alert-100 p-5 text-alert-900">
      <p className="font-semibold text-alert-700">{title}</p>
      <p className="mt-1 text-sm text-ink-700">{message}</p>
      {onRetry ? (
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="p-8 text-center text-ink-500">
      {label}…
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1 block font-semibold text-ink-900">
        {label}
        {required ? (
          <span className="text-alert-700" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>
      {hint ? (
        <p id={`${htmlFor}-hint`} className="mb-1 text-sm text-ink-500">
          {hint}
        </p>
      ) : null}
      {children}
      {/* Errors are announced, not merely coloured. */}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 font-medium text-alert-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "w-full min-h-11 rounded-lg border border-sandal-300 bg-white px-3 py-2 text-ink-900 placeholder:text-ink-500 focus:border-temple-600";
