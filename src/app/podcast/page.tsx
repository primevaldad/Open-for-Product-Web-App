import { Headphones, MicVocal, Music2 } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing-page-shell";

const episodes = [
  {
    icon: MicVocal,
    title: "Project conversations",
    copy: "Deep dives with people building inside Open for Product and the projects connected to it.",
  },
  {
    icon: Headphones,
    title: "Practical lessons",
    copy: "Episodes focused on contribution, collaboration, and the tools that make distributed work easier.",
  },
  {
    icon: Music2,
    title: "A calmer cadence",
    copy: "We want the podcast to feel thoughtful and grounded, with enough room for context and reflection.",
  },
];

export default function PodcastPage() {
  return (
    <MarketingPageShell
      eyebrow="Podcast"
      title="Better conversations. Fuller perspective. Stronger future."
      intro="A show for people who want to build better together. Each episode explores one topic from multiple angles—not to win, but to understand. By moving through dialogue, debate, discourse, and diatribe, the project creates a playful but serious space for nuance, disagreement, humor, research, and common ground.

The vision is a world where better conversations help create fuller perspectives, stronger communities, and a more thoughtful public culture."
      primaryCta={{ href: "/contact", label: "Pitch an episode" }}
      secondaryCta={{ href: "/blog", label: "Read the blog" }}
    >
      <div className="grid gap-6 md:grid-cols-3">
        {episodes.map(({ icon: Icon, title, copy }) => (
          <article key={title} className="rounded-2xl border border-[#e1d7c6] bg-white/60 p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#b8512c] text-white">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-5 font-serif text-2xl">{title}</h2>
            <p className="mt-3 leading-7 text-[#5c584d]">{copy}</p>
          </article>
        ))}
      </div>
    </MarketingPageShell>
  );
}
