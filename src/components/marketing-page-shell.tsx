import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type MarketingPageShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  primaryCta?: {
    href: string;
    label: string;
    external?: boolean;
  };
  secondaryCta?: {
    href: string;
    label: string;
    external?: boolean;
  };
  children: ReactNode;
};

export function MarketingPageShell({
  eyebrow,
  title,
  intro,
  primaryCta,
  secondaryCta,
  children,
}: MarketingPageShellProps) {
  return (
    <main className="min-h-screen bg-[#f6f0e5] text-[#292820]">
      <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6b6557] transition hover:text-[#b8512c]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-12 pt-6 lg:px-10 lg:pb-16 lg:pt-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a7658]">
            {eyebrow}
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[0.98] tracking-[-0.04em] sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4f4b40]">
            {intro}
          </p>
          {(primaryCta || secondaryCta) && (
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              {primaryCta && (
                primaryCta.external ? (
                  <a
                    href={primaryCta.href}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b8512c] px-6 py-4 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#9e4323]"
                  >
                    {primaryCta.label}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ) : (
                  <Link
                    href={primaryCta.href}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b8512c] px-6 py-4 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#9e4323]"
                  >
                    {primaryCta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )
              )}
              {secondaryCta && (
                secondaryCta.external ? (
                  <a
                    href={secondaryCta.href}
                    className="inline-flex items-center justify-center rounded-xl border border-[#b8512c] px-6 py-4 font-semibold text-[#a84827] transition hover:bg-[#fffaf2]"
                  >
                    {secondaryCta.label}
                  </a>
                ) : (
                  <Link
                    href={secondaryCta.href}
                    className="inline-flex items-center justify-center rounded-xl border border-[#b8512c] px-6 py-4 font-semibold text-[#a84827] transition hover:bg-[#fffaf2]"
                  >
                    {secondaryCta.label}
                  </Link>
                )
              )}
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-[#dfd5c5] bg-[#fbf8f1]">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-10">
          {children}
        </div>
      </section>
    </main>
  );
}
