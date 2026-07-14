import { CheckCircle2, ClipboardList, Compass, Layers3, Users2 } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing-page-shell";

const steps = [
  {
    icon: Users2,
    title: "Start with people",
    copy: "Projects begin with a real need, a real mission, and the capacity of the people who want to help.",
  },
  {
    icon: ClipboardList,
    title: "Make contribution visible",
    copy: "Work, credit, and progress should be easy to see so collaborators can understand where they fit.",
  },
  {
    icon: Layers3,
    title: "Build in layers",
    copy: "Small useful actions can become pathways, systems, and shared knowledge that compound over time.",
  },
  {
    icon: Compass,
    title: "Keep the direction clear",
    copy: "A project should make it easier to tell what matters now, what can wait, and where momentum should go next.",
  },
];

export default function HowItWorksPage() {
  return (
    <MarketingPageShell
      eyebrow="How it works"
      title="A clearer path from interest to contribution."
      intro="Open for Product is designed to help people find meaningful work, understand what a project needs, and join in without needing to fit a rigid team structure."
      primaryCta={{ href: "/projects", label: "Browse projects" }}
      secondaryCta={{ href: "/about", label: "Read the mission" }}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {steps.map(({ icon: Icon, title, copy }) => (
          <article key={title} className="rounded-2xl border border-[#e1d7c6] bg-white/60 p-7 shadow-[0_10px_30px_rgba(62,49,31,0.06)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#b8512c] text-white">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-5 font-serif text-3xl">{title}</h2>
            <p className="mt-3 leading-7 text-[#5c584d]">{copy}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-3xl bg-[#687052] p-8 text-[#fffaf2] lg:p-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e5e0ca]">
            For now
          </p>
          <h2 className="mt-3 font-serif text-4xl">This is the first pass, not the final shape.</h2>
          <p className="mt-4 leading-7 text-[#f0ecdf]">
            We are intentionally starting with simple, readable pages that keep the navigation working while the product
            experience matures. The goal is consistency first, then richer interaction.
          </p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
