import { Mail, MessageSquareQuote, PhoneCall } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing-page-shell";

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrow="Contact"
      title="Reach out with questions, ideas, or a project to discuss."
      intro="This page gives people a place to start the conversation, whether they want to collaborate, ask about the platform, or suggest a direction for future work."
      primaryCta={{ href: "mailto:hello@openforproduct.com", label: "Email us", external: true }}
      secondaryCta={{ href: "/support", label: "Support the work" }}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <article className="rounded-2xl border border-[#e1d7c6] bg-white/60 p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ebe1cb] text-[#a84827]">
            <Mail className="h-5 w-5" />
          </div>
          <h2 className="mt-5 font-serif text-2xl">General questions</h2>
          <p className="mt-3 leading-7 text-[#5c584d]">Send a note if you are curious about the platform or want to learn how to participate.</p>
        </article>
        <article className="rounded-2xl border border-[#e1d7c6] bg-white/60 p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ebe1cb] text-[#a84827]">
            <MessageSquareQuote className="h-5 w-5" />
          </div>
          <h2 className="mt-5 font-serif text-2xl">Partnership ideas</h2>
          <p className="mt-3 leading-7 text-[#5c584d]">Reach out if your project, community, or organization has a collaboration in mind.</p>
        </article>
        <article className="rounded-2xl border border-[#e1d7c6] bg-white/60 p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ebe1cb] text-[#a84827]">
            <PhoneCall className="h-5 w-5" />
          </div>
          <h2 className="mt-5 font-serif text-2xl">Short intro calls</h2>
          <p className="mt-3 leading-7 text-[#5c584d]">We can use the first conversation to learn what you need and point you to the right next step.</p>
        </article>
      </div>
    </MarketingPageShell>
  );
}
