"use client";

import React from "react";
import {
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";

type Principle = {
  id: string;
  observation: string;
  name: string;
  prompt: string;
  storyTitle: string;
  story: string[];
  applicationTitle: string;
  application: string[];
  visual: React.ReactNode;
};

const principles: Principle[] = [
  {
    id: "winds-of-why",
    observation: "People move farther when they know why they’re moving.",
    name: "The Winds of Why",
    prompt: "How do we uncover and strengthen shared purpose inside a project?",
    storyTitle: "A sailboat cannot command the wind.",
    story: [
      "A skilled crew does not create the wind. They pay attention to where it is already moving, change the angle of the sails, and use that force to travel somewhere the wind alone would never take them.",
      "The same wind can strand one boat and carry another across an ocean. The difference is orientation.",
    ],
    applicationTitle: "For Open for Product, purpose is not a slogan.",
    application: [
      "It is the shared reason a project exists, who it should help, and why people should spend part of their lives moving it forward.",
      "When that reason is clear, decisions become easier. People can tell which ideas belong, which opportunities are distractions, and where their effort will matter.",
    ],
    visual: <SailVisual />,
  },
  {
    id: "up-lift",
    observation:
      "Communities grow stronger when each improvement becomes something others can build from.",
    name: "The Up Lift",
    prompt: "What does this decision make easier, safer, or more possible for others?",
    storyTitle: "A bird does not fly because one feather works harder.",
    story: [
      "A wing is made of different kinds of feathers doing different jobs. Primary feathers help with propulsion and control. Secondary feathers help create lift. Smaller coverts smooth the airflow across the wing.",
      "As a bird soars, muscles make tiny adjustments to feather position. Overlapping layers hold together as a lifting surface, then separate when the bird needs to manage changing air.",
      "No single feather creates flight. Lift emerges from the way the parts are arranged, connected, and continually adjusted.",
    ],
    applicationTitle: "That is the question behind the Up Lift.",
    application: [
      "A useful contribution should not stop with the person who made it. A template, decision, lesson, process, introduction, or piece of code should create better footing for the next person.",
      "The goal is not to make everyone identical. It is to arrange different contributions so they can support one another.",
    ],
    visual: <WingVisual />,
  },
  {
    id: "slingshot-effect",
    observation: "Momentum grows when success is shared instead of stored.",
    name: "The Slingshot Effect",
    prompt: "How can one person’s momentum accelerate the next useful thing?",
    storyTitle: "Spacecraft rarely take the shortest path.",
    story: [
      "Missions traveling across the solar system often swing around a planet first. The planet’s gravity changes the spacecraft’s direction and can increase its speed without requiring the same amount of additional fuel.",
      "A well-planned encounter turns existing motion into new momentum.",
    ],
    applicationTitle: "Projects can route momentum the same way.",
    application: [
      "A conference talk can become documentation. Documentation can become onboarding. A successful launch can introduce another member’s work. A useful question can become a workshop.",
      "Instead of treating attention, learning, and success as isolated wins, Open for Product asks where that energy should go next.",
    ],
    visual: <OrbitVisual />,
  },
  {
    id: "adaptive-body",
    observation: "Flexible systems survive longer than rigid ones.",
    name: "The Adaptive Body",
    prompt: "What can be reused, rearranged, or changed without rebuilding everything?",
    storyTitle: "Good software is built from parts that can change jobs.",
    story: [
      "A useful component rarely stays in the exact place where it was first created. A button becomes part of dozens of screens. An authentication system supports an entire product. A workflow built for one team becomes the basis for another.",
      "The value is not only in what the component does today. It is in how easily it can be adapted tomorrow.",
    ],
    applicationTitle: "Open for Product treats community knowledge the same way.",
    application: [
      "A workshop can become a guide. A guide can become a learning path. A governance pattern can be reused by another project and improved through practice.",
      "The system should help people preserve what works without forcing every new project to copy the same shape.",
    ],
    visual: <BlocksVisual />,
  },
  {
    id: "mastery",
    observation: "Showing how the work is done teaches more than hiding the method.",
    name: "The Real Magic Is in Mastery",
    prompt: "What becomes possible when people can see the process as well as the result?",
    storyTitle: "Penn & Teller sometimes perform magic in clear cups.",
    story: [
      "In their version of the classic Cups and Balls routine, the audience can watch the objects move. The secret is visible.",
      "The performance does not become less impressive. It becomes impressive for a different reason: you can finally see the timing, coordination, practice, and control required to make the effect work.",
    ],
    applicationTitle: "Open for Product is built for visible practice.",
    application: [
      "People should be able to study how a decision was made, how a system evolved, what failed, and what finally worked.",
      "Showing the route gives others a place to begin. It also lets expertise be recognized for what it actually is: practiced judgment, not unexplained magic.",
    ],
    visual: <CupsVisual />,
  },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export default function LiftModelAboutPage() {
  const reduceMotion = useReducedMotion();

  const reveal: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.65, ease: "easeOut" },
    },
  };

  return (
    <main className="min-h-screen bg-[#F5F0E8] text-[#151515]">
      <Hero reveal={reveal} />

      <section className="border-y border-black/10 bg-[#1E1F1D] text-[#F5F0E8]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            className="max-w-4xl"
          >
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.22em] text-[#D8613A]">
              What Open for Product is
            </p>
            <h2 className="text-balance text-4xl font-semibold leading-tight md:text-6xl">
              Build together. Stay independent.
            </h2>
            <div className="mt-8 space-y-5 text-lg leading-8 text-white/78 md:text-xl">
              <p>
                Most collaboration software assumes you are joining one company,
                one team, or one long-term project. Real creative work rarely
                looks like that.
              </p>
              <p>
                Open for Product is a collaborative workspace for projects that
                grow through communities instead of hierarchies. People can
                create projects, invite contributors, share knowledge, develop
                governance that fits the team, and build systems others can
                reuse and improve.
              </p>
              <p>
                It is designed for work that overlaps, changes shape, and makes
                room for people whose lives do not fit a conventional workplace.
                The aim is not only to produce better projects. It is to help
                participants leave better equipped to build whatever comes next.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="observations" className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="max-w-3xl"
        >
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-[#A33E23]">
            Five observations
          </p>
          <h2 className="text-4xl font-semibold leading-tight md:text-6xl">
            We kept seeing the same patterns.
          </h2>
          <p className="mt-6 text-lg leading-8 text-black/70">
            The Lift Model did not begin as a set of slogans. It emerged from
            noticing what helps people keep moving, what makes collaboration
            useful, and what allows one contribution to support the next.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {principles.map((item, index) => (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => scrollToId(item.id)}
              variants={reveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: reduceMotion ? 0 : index * 0.06 }}
              className="group min-h-64 rounded-[2rem] border border-black/10 bg-card p-6 text-left shadow-[0_16px_40px_rgba(0,0,0,0.05)] transition hover:-translate-y-1 hover:border-[#C2401C]/40 hover:shadow-[0_18px_50px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-[#C2401C] focus:ring-offset-4"
            >
              <span className="font-mono text-xs text-black/45">
                0{index + 1}
              </span>
              <p className="mt-10 text-xl font-medium leading-7">
                {item.observation}
              </p>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#A33E23]">
                Read the story
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="bg-[#E8E0D3]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-24">
          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end"
          >
            <div>
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-[#A33E23]">
                The framework
              </p>
              <h2 className="text-4xl font-semibold leading-tight md:text-5xl">
                Observation → principle → practice
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-black/68">
              Each principle gives the observation a name, then turns it into a
              question a project can actually use. The stories below show where
              the principle comes from. The final paragraph shows what it changes
              inside Open for Product.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-4 md:grid-cols-5">
            {principles.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToId(item.id)}
                className="rounded-2xl border border-black/10 bg-[#F5F0E8] p-5 text-left transition hover:border-[#C2401C]/40 focus:outline-none focus:ring-2 focus:ring-[#C2401C]"
              >
                <span className="text-sm font-semibold">{item.name}</span>
                <p className="mt-3 text-sm leading-6 text-black/60">
                  {item.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        {principles.map((item, index) => (
          <PrincipleSection
            key={item.id}
            item={item}
            index={index}
            reveal={reveal}
          />
        ))}
      </section>

      <section className="border-t border-black/10 bg-[#1E1F1D] text-[#F5F0E8]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            className="grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-end"
          >
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#D8613A]">
                What this changes
              </p>
              <h2 className="mt-5 max-w-4xl text-balance text-4xl font-semibold leading-tight md:text-6xl">
                A platform should do more than move people through a workflow.
              </h2>
              <p className="mt-7 max-w-3xl text-lg leading-8 text-white/72">
                Open for Product is being designed so participation leaves useful
                traces: clearer decisions, reusable tools, stronger relationships,
                documented learning, and new opportunities for the people around
                the work.
              </p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-7">
              <p className="text-sm uppercase tracking-[0.16em] text-white/45">
                The test
              </p>
              <p className="mt-4 text-2xl font-medium leading-9">
                Did the project only produce an output, or did it increase the
                community’s ability to produce the next one?
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#C2401C] text-white">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="max-w-4xl"
          >
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/70">
              The question that matters
            </p>
            <h2 className="mt-5 text-balance text-5xl font-semibold leading-none md:text-8xl">
              What are you building?
            </h2>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/82">
              Software. A business. A book. A neighborhood initiative. A
              research project. A different way of working. Open for Product is
              being built for people who want to make it alongside others
              without surrendering what makes the work theirs.
            </p>
            <a
              href="/projects"
              className="mt-10 inline-flex rounded-full bg-[#F5F0E8] px-7 py-4 font-semibold text-[#151515] transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-4 focus:ring-offset-[#C2401C]"
            >
              See our projects
            </a>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

function Hero({ reveal }: { reveal: Variants }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(194,64,28,0.16),transparent_28%),linear-gradient(to_bottom,#F5F0E8,#EFE7DC)]" />
      <div className="relative mx-auto grid min-h-[88vh] max-w-7xl items-center gap-12 px-6 py-20 md:px-10 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          variants={reveal}
          initial="hidden"
          animate="visible"
          className="max-w-4xl"
        >
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#A33E23]">
            Why Open for Product exists
          </p>
          <h1 className="mt-6 text-balance text-5xl font-semibold leading-[0.98] md:text-7xl lg:text-8xl">
            What if a platform helped people lift one another?
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-black/68 md:text-xl">
            Most systems are built to move people through them. Open for Product
            starts somewhere else: with cooperative projects, visible learning,
            flexible participation, and work that leaves the people around it
            more capable than before.
          </p>
          <button
            type="button"
            onClick={() => scrollToId("observations")}
            className="mt-10 inline-flex items-center gap-3 rounded-full border border-black/15 bg-white/70 px-6 py-3.5 font-semibold backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#C2401C]"
          >
            See what shaped the model
            <span aria-hidden="true">↓</span>
          </button>
        </motion.div>

        <motion.div
          variants={reveal}
          initial="hidden"
          animate="visible"
          className="relative mx-auto aspect-square w-full max-w-[620px]"
        >
          <HeroVisual />
        </motion.div>
      </div>
    </section>
  );
}

function PrincipleSection({
  item,
  index,
  reveal,
}: {
  item: Principle;
  index: number;
  reveal: Variants;
}) {
  const reverse = index % 2 === 1;

  return (
    <article
      id={item.id}
      className={`scroll-mt-8 border-t border-black/10 ${index % 2 === 0 ? "bg-[#F5F0E8]" : "bg-[#f0e8db]"
        }`}
    >
      <div
        className={`mx-auto grid max-w-7xl gap-12 px-6 py-20 md:px-10 md:py-28 lg:grid-cols-2 lg:items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""
          }`}
      >
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="overflow-hidden rounded-[2.5rem] border border-black/10 bg-[#E8E0D3] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.08)] md:p-10"
        >
          {item.visual}
        </motion.div>

        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="max-w-2xl"
        >
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#A33E23]">
            Observation {String(index + 1).padStart(2, "0")}
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">
            {item.name}
          </h2>
          <p className="mt-5 text-xl font-medium leading-8 text-black/82">
            {item.storyTitle}
          </p>

          <div className="mt-7 space-y-5 text-lg leading-8 text-black/66">
            {item.story.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-9 border-l-4 border-[#C2401C] pl-6">
            <h3 className="text-xl font-semibold">{item.applicationTitle}</h3>
            <div className="mt-4 space-y-4 text-base leading-7 text-black/68">
              {item.application.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-black/[0.045] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-black/45">
              The working question
            </p>
            <p className="mt-2 text-lg font-medium leading-7">{item.prompt}</p>
          </div>
        </motion.div>
      </div>
    </article>
  );
}

function HeroVisual() {
  return (
    <svg
      viewBox="0 0 640 640"
      role="img"
      aria-label="Abstract upward motion formed by layered paths and project nodes"
      className="h-full w-full"
    >
      <defs>
        <radialGradient id="heroGlow">
          <stop offset="0%" stopColor="#D8613A" stopOpacity=".72" />
          <stop offset="100%" stopColor="#D8613A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="heroPath" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#1E1F1D" />
          <stop offset="100%" stopColor="#C2401C" />
        </linearGradient>
      </defs>
      <circle cx="430" cy="160" r="150" fill="url(#heroGlow)" />
      <path
        d="M90 560C180 510 195 410 280 380C370 348 364 264 452 225C510 199 523 124 555 62"
        fill="none"
        stroke="url(#heroPath)"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M90 560C160 494 255 518 314 446C366 382 430 406 483 343"
        fill="none"
        stroke="#1E1F1D"
        strokeOpacity=".18"
        strokeWidth="2"
        strokeDasharray="10 12"
      />
      {[
        [90, 560],
        [280, 380],
        [452, 225],
        [555, 62],
        [314, 446],
        [483, 343],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="22" fill="#F5F0E8" stroke="#1E1F1D" strokeWidth="3" />
          <circle cx={cx} cy={cy} r="7" fill="#C2401C" />
        </g>
      ))}
      <path
        d="M536 88L556 60L575 90"
        fill="none"
        stroke="#C2401C"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SailVisual() {
  return (
    <svg viewBox="0 0 620 440" role="img" aria-label="Sailboat changing its angle to catch the wind" className="w-full">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A8C8CF" />
          <stop offset="100%" stopColor="#5A8993" />
        </linearGradient>
      </defs>
      <rect width="620" height="440" rx="28" fill="#D9E3DD" />
      <path d="M0 310C120 270 220 348 340 310C455 273 530 300 620 270V440H0Z" fill="url(#sea)" />
      <path d="M310 85V332" stroke="#1E1F1D" strokeWidth="8" strokeLinecap="round" />
      <path d="M306 96L175 250H306Z" fill="#F5F0E8" stroke="#1E1F1D" strokeWidth="4" />
      <path d="M315 112L438 270H315Z" fill="#C2401C" stroke="#1E1F1D" strokeWidth="4" />
      <path d="M200 330H440L400 374H246Z" fill="#1E1F1D" />
      <path d="M60 125C145 80 220 120 278 82" fill="none" stroke="#C2401C" strokeWidth="5" strokeLinecap="round" strokeDasharray="12 12" />
      <path d="M74 176C154 140 206 160 250 132" fill="none" stroke="#C2401C" strokeOpacity=".55" strokeWidth="4" strokeLinecap="round" strokeDasharray="9 12" />
      <path d="M275 82L248 76L260 101" fill="none" stroke="#C2401C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WingVisual() {
  const feathers = Array.from({ length: 8 }, (_, i) => i);
  return (
    <svg viewBox="0 0 620 440" role="img" aria-label="Layered bird feathers forming an adaptive wing" className="w-full">
      <rect width="620" height="440" rx="28" fill="#DDE5D6" />
      <path d="M84 293C185 112 402 92 553 192C427 178 322 225 250 349C194 350 136 333 84 293Z" fill="#1E1F1D" />
      {feathers.map((i) => (
        <path
          key={i}
          d={`M${120 + i * 46} ${285 - i * 10}C${170 + i * 45} ${165 - i * 2} ${232 + i * 41} ${145 + i * 6} ${286 + i * 38} ${189 + i * 7}C${235 + i * 34} ${229 + i * 12} ${198 + i * 34} ${292 + i * 8} ${166 + i * 36} ${348 - i * 2}Z`}
          fill={i % 2 === 0 ? "#F5F0E8" : "#C7B9A6"}
          stroke="#1E1F1D"
          strokeWidth="3"
        />
      ))}
      <path d="M70 120C170 82 256 114 330 79" fill="none" stroke="#C2401C" strokeWidth="5" strokeLinecap="round" strokeDasharray="13 13" />
      <path d="M330 79L304 72L316 98" fill="none" stroke="#C2401C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrbitVisual() {
  return (
    <svg viewBox="0 0 620 440" role="img" aria-label="Spacecraft using a planet for a gravity assist" className="w-full">
      <rect width="620" height="440" rx="28" fill="#111826" />
      <circle cx="390" cy="230" r="92" fill="#D8613A" />
      <circle cx="365" cy="205" r="20" fill="#F5F0E8" opacity=".2" />
      <path d="M60 340C214 390 260 333 297 285C329 244 330 172 386 124C442 76 520 97 570 42" fill="none" stroke="#F5F0E8" strokeWidth="4" strokeDasharray="12 12" />
      <path d="M546 46L572 40L566 67" fill="none" stroke="#F5F0E8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(264 302) rotate(-28)">
        <path d="M0 0L28 10L0 20L7 10Z" fill="#F5F0E8" />
        <path d="M-18 10H7" stroke="#D8613A" strokeWidth="5" strokeLinecap="round" />
      </g>
      <circle cx="100" cy="80" r="3" fill="#F5F0E8" />
      <circle cx="180" cy="140" r="2" fill="#F5F0E8" />
      <circle cx="520" cy="310" r="3" fill="#F5F0E8" />
    </svg>
  );
}

function BlocksVisual() {
  return (
    <svg viewBox="0 0 620 440" role="img" aria-label="Reusable software and community components rearranging into new forms" className="w-full">
      <rect width="620" height="440" rx="28" fill="#E3DDD2" />
      {[
        [90, 110, 130, 90, "#C2401C"],
        [250, 110, 110, 90, "#1E1F1D"],
        [390, 110, 140, 90, "#9DAA90"],
        [130, 245, 180, 90, "#F5F0E8"],
        [350, 245, 130, 90, "#C7B9A6"],
      ].map(([x, y, w, h, fill], i) => (
        <g key={i}>
          <rect x={x as number} y={y as number} width={w as number} height={h as number} rx="20" fill={fill as string} stroke="#1E1F1D" strokeWidth="3" />
          <circle cx={Number(x) + 22} cy={Number(y) + 22} r="6" fill={fill === "#1E1F1D" ? "#F5F0E8" : "#1E1F1D"} opacity=".7" />
        </g>
      ))}
      <path d="M220 154H250M360 154H390M309 290H350" stroke="#C2401C" strokeWidth="5" strokeDasharray="8 8" />
      <path d="M315 210V246" stroke="#C2401C" strokeWidth="5" strokeDasharray="8 8" />
    </svg>
  );
}

function CupsVisual() {
  return (
    <svg viewBox="0 0 620 440" role="img" aria-label="Transparent cups revealing the method behind a magic routine" className="w-full">
      <rect width="620" height="440" rx="28" fill="#24192E" />
      <ellipse cx="310" cy="350" rx="240" ry="34" fill="#000" opacity=".25" />
      {[120, 255, 390].map((x, i) => (
        <g key={x}>
          <path
            d={`M${x} 145H${x + 105}L${x + 91} 315H${x + 14}Z`}
            fill="#F5F0E8"
            fillOpacity=".18"
            stroke="#F5F0E8"
            strokeWidth="4"
          />
          <ellipse cx={x + 52} cy={i === 1 ? 284 : 188} rx="20" ry="20" fill="#D8613A" />
        </g>
      ))}
      <path d="M120 116C225 70 342 84 495 108" fill="none" stroke="#D8613A" strokeWidth="4" strokeDasharray="10 12" />
      <circle cx="520" cy="85" r="5" fill="#F5F0E8" />
    </svg>
  );
}