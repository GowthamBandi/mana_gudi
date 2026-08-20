"use client";

import { useLanguage } from "@/lib/i18n/context";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`inline-flex items-center rounded-lg border border-marigold-400 bg-temple-900/80 p-0.5 text-xs font-semibold ${className}`}>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={`rounded px-2 py-1 transition-colors ${
          language === "en"
            ? "bg-marigold-500 text-temple-900 font-bold shadow-sm"
            : "text-marigold-100 hover:text-white"
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLanguage("te")}
        aria-pressed={language === "te"}
        className={`rounded px-2 py-1 transition-colors ${
          language === "te"
            ? "bg-marigold-500 text-temple-900 font-bold shadow-sm"
            : "text-marigold-100 hover:text-white"
        }`}
      >
        తెలుగు
      </button>
    </div>
  );
}
