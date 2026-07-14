import Link from "next/link";
import {
ArrowRight,
Check,
CircleDollarSign,
Compass,
Heart,
Leaf,
Mail,
Sparkles,
Sprout,
Users,
} from "lucide-react";

const projects = [
{
title: "Fundry",
description:
"A simpler way to move complex projects forward through transparent, contributor-directed funding.",
category: "Funding",
collaborators: "Early contributors welcome",
visual: "fundry",
},
{
title: "Open Book",
description:
"A participatory publishing experiment where communities help shape books one chapter at a time.",
category: "Publishing",
collaborators: "Writers, readers, facilitators",
visual: "book",
},
{
title: "Session Queen",
description:
"A context-preserving workspace for people who think, research, and build across many tools.",
category: "Technology",
collaborators: "Testers and product thinkers",
visual: "queen",
},
];

const principles = [
{
icon: Users,
title: "Contribute what you can",
copy: "Your time, skills, perspective, and energy are welcome. No rigid commitments required.",
},
{
icon: Sprout,
title: "Learn while building",
copy: "Grow your skills, explore new interests, and work alongside people who see things differently.",
},
{
icon: CircleDollarSign,
title: "Share in the value",
copy: "Contribution should be visible, credited, and connected to the value a project creates.",
},
];

const communityValues = [
[Heart, "Human first, always"],
[Leaf, "Slow tech, meaningful impact"],
[Check, "Open, transparent, accountable"],
[Compass, "Designed for real lives"],
] as const;

function BrandMark() {
return (
<div className="flex items-center gap-3" aria-label="Open for Product">
    <div className="relative h-10 w-10 shrink-0">
        <span className="absolute inset-0 rounded-full border-2 border-[#b8512c]" />
        <span className="absolute inset-[6px] rounded-full border-2 border-[#b8512c]" />
        <span className="absolute bottom-[2px] left-[2px] h-5 w-5 rounded-full border-2 border-[#b8512c]" />
    </div>
    <div className="font-serif text-[17px] leading-[0.95] tracking-[-0.02em] text-[#25251f]">
        <div>OPEN</div>
        <div className="pl-3 text-[10px] italic">for</div>
        <div>PRODUCT</div>
    </div>
</div>
);
}

function HeroLandscape() {
return (
<div className="relative aspect-[1.16/1] min-h-[390px] overflow-hidden rounded-[42%_42%_18%_18%/30%_30%_14%_14%] bg-[#ead6b7] shadow-[0_30px_80px_rgba(64,48,27,0.14)]"
    aria-hidden="true">
    <div
        className="absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(circle_at_22%_26%,rgba(255,255,255,0.55),transparent_27%),linear-gradient(#f0dcc0,#ead2aa)]" />
    <div className="absolute left-[45%] top-[23%] h-36 w-36 rounded-full bg-[#bd5125]" />
    <div className="absolute -left-[10%] top-[42%] h-56 w-[72%] rounded-[50%] bg-[#929166] rotate-[8deg]" />
    <div className="absolute right-[-12%] top-[37%] h-64 w-[72%] rounded-[50%] bg-[#a8a174] -rotate-[7deg]" />
    <div className="absolute -left-[12%] top-[54%] h-60 w-[86%] rounded-[50%] bg-[#6f7551] rotate-[6deg]" />
    <div className="absolute right-[-15%] top-[54%] h-56 w-[80%] rounded-[50%] bg-[#7f8057] -rotate-[7deg]" />
    <div className="absolute inset-x-0 bottom-0 h-[47%] bg-[#c5aa69]" />
    <div
        className="absolute left-[43%] top-[51%] h-[65%] w-[24%] origin-top -rotate-[5deg] rounded-[50%] bg-[#f7ead2] shadow-inner" />
    <div className="absolute bottom-[-4%] left-[48%] h-[52%] w-[26%] rotate-[8deg] rounded-[50%] bg-[#fff4df]" />
    <div className="absolute bottom-6 left-6 h-28 w-4 rounded-full bg-[#2f503f] rotate-[-10deg]" />
    <div className="absolute bottom-7 left-12 h-20 w-4 rounded-full bg-[#2f503f] rotate-[14deg]" />
    <div className="absolute bottom-4 right-8 h-32 w-4 rounded-full bg-[#2f503f] rotate-[8deg]" />
    <div className="absolute bottom-7 right-16 h-20 w-4 rounded-full bg-[#2f503f] rotate-[-12deg]" />
</div>
);
}

function ProjectVisual({ type }: { type: string }) {
if (type === "fundry") {
return (
<div className="relative h-44 overflow-hidden bg-[#d8e1d4]">
    <div className="absolute inset-x-0 bottom-0 h-20 bg-[#6e7755]" />
    <div className="absolute bottom-12 left-10 h-20 w-2 bg-[#f7f2e8]" />
    <div className="absolute bottom-16 left-5 h-px w-12 rotate-[22deg] bg-[#f7f2e8]" />
    <div className="absolute bottom-16 left-5 h-px w-12 -rotate-[22deg] bg-[#f7f2e8]" />
    <div className="absolute bottom-12 left-28 h-24 w-2 bg-[#f7f2e8]" />
    <div className="absolute bottom-18 left-24 h-px w-12 rotate-[22deg] bg-[#f7f2e8]" />
    <div className="absolute bottom-18 left-24 h-px w-12 -rotate-[22deg] bg-[#f7f2e8]" />
</div>
);
}

if (type === "book") {
return (
<div className="grid h-44 grid-cols-3 grid-rows-2 overflow-hidden bg-[#e8d1a8]">
    <div className="bg-[#2f5a56]" />
    <div className="bg-[#d6ae69]" />
    <div className="bg-[#ede0c5]" />
    <div className="bg-[#b9552d]" />
    <div className="bg-[#63705c]" />
    <div className="bg-[#d9c694]" />
</div>
);
}

return (
<div className="relative h-44 overflow-hidden bg-[#18272f]">
    <div
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d4c178] shadow-[0_0_40px_rgba(212,193,120,0.35)]" />
    <div
        className="absolute left-1/2 top-1/2 h-7 w-44 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] rounded-[50%] border-4 border-[#b88958]" />
    <Sparkles className="absolute left-8 top-8 h-4 w-4 text-[#f5e6aa]" />
    <Sparkles className="absolute right-12 top-6 h-3 w-3 text-[#f5e6aa]" />
    <Sparkles className="absolute bottom-8 left-16 h-3 w-3 text-[#f5e6aa]" />
</div>
);
}

export default function HomePage() {
return (
<main className="min-h-screen">
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="rounded-sm focus:outline-none focus:ring-2 focus:ring-[#b8512c] focus:ring-offset-4">
        <BrandMark />
        </Link>

        <Link href="#support"
            className="rounded-xl bg-[#b8512c] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#9e4323]">
        Support our work
        </Link>
    </header>

    <section
        className="mx-auto grid w-full max-w-7xl gap-12 px-6 pb-16 pt-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:pb-24 lg:pt-16">
        <div className="flex flex-col justify-center">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#7a7658]">
                A different way into meaningful work
            </p>
            <h1 className="max-w-3xl font-serif text-5xl leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                Build something <span className="italic text-[#b8512c]">that matters.</span> Together.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#4f4b40]">
                Open for Product connects people to meaningful projects where they can contribute what they can,
                when they can, and receive fair credit for the value they help create.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="#match"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b8512c] px-6 py-4 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#9e4323]">
                Help me find a project
                <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="#support"
                    className="inline-flex items-center justify-center rounded-xl border border-[#b8512c] px-6 py-4 font-semibold text-[#a84827] transition hover:bg-[#fffaf2]">
                Support Open for Product
                </Link>
            </div>
            <p className="mt-5 max-w-sm pl-3 font-serif text-base italic leading-6 text-[#4d493e]">
                Answer a few questions. We’ll introduce you to projects you might genuinely enjoy.
            </p>
        </div>
        <HeroLandscape />
    </section>

    <section className="border-y border-[#dfd5c5] bg-[#fbf8f1]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
            <div className="mx-auto max-w-3xl text-center">
                <h2 className="font-serif text-4xl tracking-[-0.03em]">Work should adapt to people.</h2>
                <div className="mx-auto mt-4 h-1 w-12 rounded bg-[#b8512c]" />
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
                {principles.map(({ icon: Icon, title, copy }) => (
                <article key={title} className="rounded-2xl border border-[#e1d7c6] bg-card p-7">
                    <div
                        className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#b8512c] text-white">
                        <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-serif text-2xl">{title}</h3>
                    <p className="mt-3 leading-7 text-[#5c584d]">{copy}</p>
                </article>
                ))}
            </div>
        </div>
    </section>

    <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr]">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7a7658]">Happening now</p>
                <h2 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.03em]">
                    People are building <span className="italic text-[#b8512c]">amazing things.</span>
                </h2>
                <p className="mt-5 max-w-sm leading-7 text-[#5c584d]">
                    Here are a few projects that could use collaborators, thoughtful feedback, or a little momentum.
                </p>
                <Link href="/projects"
                    className="mt-8 inline-flex items-center gap-2 font-semibold text-[#a84827] underline-offset-4 hover:underline">
                Browse all projects
                <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
                {projects.map((project) => (
                <article key={project.title}
                    className="overflow-hidden rounded-2xl border border-[#dfd5c5] bg-[#fffaf2] shadow-[0_12px_36px_rgba(62,49,31,0.07)]">
                    <ProjectVisual type={project.visual} />
                    <div className="p-5">
                        <h3 className="font-serif text-2xl">{project.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-[#5c584d]">{project.description}</p>
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <span className="inline-flex items-center gap-1 text-[#4f5f49]">
                                <Users className="h-3.5 w-3.5" /> {project.collaborators}
                            </span>
                            <span
                                className="rounded-full bg-[#ebe1cb] px-3 py-1 text-[#6a5c3f]">{project.category}</span>
                        </div>
                    </div>
                </article>
                ))}
            </div>
        </div>
    </section>

    <section className="mx-auto max-w-7xl px-6 pb-8 lg:px-10">
        <div
            className="grid gap-8 rounded-3xl border border-[#e1d7c6] bg-[linear-gradient(100deg,#f4e4cf,#f9f1e5)] p-8 lg:grid-cols-[0.8fr_1.2fr] lg:p-12">
            <div className="flex min-h-64 items-end rounded-2xl border border-[#dcbf9d] bg-[#f8ead7] p-8">
                <div className="grid w-full grid-cols-4 gap-4">
                    {["A", "B", "C", "D"].map((item, index) => (
                    <div key={item} className="flex flex-col items-center gap-3">
                        <div className="h-14 w-14 rounded-full border-2 border-[#ad5b39] bg-[#f6dfc6]" />
                        <div className="h-14 w-px bg-[#ad5b39]" />
                        <div className="h-1 w-full rounded bg-[#ad5b39]" style={{ opacity: 0.5 + index * 0.1 }} />
                    </div>
                    ))}
                </div>
            </div>
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7a7658]">The way we work</p>
                <h2 className="mt-3 font-serif text-4xl tracking-[-0.03em]">Building together looks different here.</h2>
                <p className="mt-5 max-w-2xl leading-7 text-[#5c584d]">
                    Open for Product is being designed as a collaborative environment that respects capacity,
                    makes contribution visible, and uses automation to support relationships rather than replace them.
                </p>
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    {communityValues.map(([Icon, label]) => (
                    <div key={label} className="flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#b8512c] text-[#b8512c]">
                            <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{label}</span>
                    </div>
                    ))}
                </div>
                <Link href="/about"
                    className="mt-8 inline-flex items-center gap-2 font-semibold text-[#a84827] underline-offset-4 hover:underline">
                Learn more about us
                <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    </section>

    <section id="match" className="scroll-mt-24">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-12 lg:grid-cols-2 lg:px-10">
            <div className="rounded-3xl bg-[#687052] p-8 text-[#fffaf2] lg:p-10">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e5e0ca]">An easier way in</p>
                <h2 className="mt-3 font-serif text-4xl">Let us introduce you.</h2>
                <p className="mt-4 max-w-xl leading-7 text-[#f0ecdf]">
                    Tell us what interests you, what kind of contribution feels realistic, and what you hope to find.
                    We’ll send a small set of thoughtful project introductions. No account required.
                </p>
                <form className="mt-8 grid gap-4" action="/api/project-match" method="post">
                    <label className="grid gap-2 text-sm font-medium">
                        What kinds of work sound interesting?
                        <input name="interests" placeholder="Technology, education, writing, community..."
                            className="rounded-xl border border-input bg-card px-4 py-3 text-[#292820] outline-none placeholder:text-[#857f72] focus:ring-2 focus:ring-[#f1d3b2]" />
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                        What could you imagine contributing?
                        <input name="contribution" placeholder="Feedback, research, design, testing, not sure yet..."
                            className="rounded-xl border border-input bg-card px-4 py-3 text-[#292820] outline-none placeholder:text-[#857f72] focus:ring-2 focus:ring-[#f1d3b2]" />
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                        Email address
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1">
                                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b7568]" />
                                <input required type="email" name="email" placeholder="you@example.com"
                                    className="w-full rounded-xl border border-input bg-card py-3 pl-11 pr-4 text-[#292820] outline-none placeholder:text-[#857f72] focus:ring-2 focus:ring-[#f1d3b2]" />
                            </div>
                            <button type="submit"
                                className="rounded-xl bg-[#b8512c] px-5 py-3 font-semibold text-white hover:bg-[#9e4323]">
                                Find my way in
                            </button>
                        </div>
                    </label>
                    <p className="text-xs text-[#e9e5d9]">We’ll use this to send your introductions—not to toss you into
                        a generic funnel.</p>
                </form>
            </div>

            <div id="support" className="scroll-mt-24 rounded-3xl bg-[#b8512c] p-8 text-white lg:p-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/60">
                    <Heart className="h-6 w-6" />
                </div>
                <h2 className="mt-7 font-serif text-4xl">Help move everything forward.</h2>
                <p className="mt-4 max-w-xl leading-7 text-[#f8e7dd]">
                    Your support helps us build and maintain the platform, grow the community, and make it easier for
                    people to discover work that matters to them.
                </p>
                <Link href="/support"
                    className="mt-8 inline-flex items-center gap-2 font-semibold underline underline-offset-4">
                Chip in and support the work
                <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    </section>

    <footer
        className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <BrandMark />
        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#555146]" aria-label="Footer navigation">
            <Link href="/projects">Projects</Link>
            <Link href="/about">About</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/podcast">Podcast</Link>
            <Link href="/contact">Contact</Link>
        </nav>
    </footer>
</main>
);
}