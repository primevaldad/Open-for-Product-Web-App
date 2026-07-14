import { CalendarDays, NotebookPen, Rocket, Sparkles } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing-page-shell";

const posts = [
  {
    icon: NotebookPen,
    title: "Notes from the build",
    copy: "Short updates on the product, the platform, and the design choices behind the workspace.",
  },
  {
    icon: Sparkles,
    title: "Ideas in progress",
    copy: "Experiments, observations, and rough edges we are exploring as the system takes shape.",
  },
  {
    icon: Rocket,
    title: "Launch stories",
    copy: "Project highlights and community lessons from the moments when ideas become real work.",
  },
];

export default function BlogPage() {
  return (
    <MarketingPageShell
      eyebrow="Blog"
      title="A place for updates, ideas, and work in progress."
      intro="The blog is not live yet, but the shape is simple: a home for product notes, community thinking, and stories that help people understand where the platform is heading."
      primaryCta={{ href: "/contact", label: "Suggest a topic" }}
      secondaryCta={{ href: "/podcast", label: "See the podcast" }}
    >
      <div className="grid gap-6 md:grid-cols-3">
        {posts.map(({ icon: Icon, title, copy }) => (
          <article key={title} className="rounded-2xl border border-[#e1d7c6] bg-[#fffaf2] p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ebe1cb] text-[#a84827]">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-5 font-serif text-2xl">{title}</h2>
            <p className="mt-3 leading-7 text-[#5c584d]">{copy}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#e1d7c6] bg-white/60 p-6">
        <CalendarDays className="mt-1 h-5 w-5 shrink-0 text-[#b8512c]" />
        <p className="leading-7 text-[#5c584d]">
          When we start publishing, these posts should feel like a useful field guide rather than a marketing feed.
        </p>
      </div>
    </MarketingPageShell>
  );
}
