import { HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing-page-shell";

export default function SupportPage() {
  return (
    <MarketingPageShell
      eyebrow="Support"
      title="Help keep the platform moving forward."
      intro="Support helps cover the work of building, maintaining, and improving the product so more people can find projects they care about."
      primaryCta={{ href: "/contact", label: "Talk to us" }}
      secondaryCta={{ href: "/projects", label: "Browse projects" }}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <article className="rounded-2xl border border-[#e1d7c6] bg-white/60 p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#b8512c] text-white">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <h2 className="mt-5 font-serif text-2xl">Community care</h2>
          <p className="mt-3 leading-7 text-[#5c584d]">Support helps us keep the experience grounded in real people and real relationships.</p>
        </article>
        <article className="rounded-2xl border border-[#e1d7c6] bg-white/60 p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#b8512c] text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="mt-5 font-serif text-2xl">Sustainable tooling</h2>
          <p className="mt-3 leading-7 text-[#5c584d]">It gives us room to maintain the core app and keep the routes, forms, and flows dependable.</p>
        </article>
        <article className="rounded-2xl border border-[#e1d7c6] bg-white/60 p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#b8512c] text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="mt-5 font-serif text-2xl">Room to grow</h2>
          <p className="mt-3 leading-7 text-[#5c584d]">Every contribution makes it easier to improve the product and add new ways to participate later.</p>
        </article>
      </div>
    </MarketingPageShell>
  );
}
