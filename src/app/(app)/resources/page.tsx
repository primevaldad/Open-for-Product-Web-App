
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const resources = [
  {
    title: "MDN Web Docs",
    description: "The Mozilla Developer Network (MDN) provides comprehensive documentation on web standards and technologies, including HTML, CSS, and JavaScript.",
    link: "https://developer.mozilla.org"
  },
  {
    title: "React Docs (New)",
    description: "The new official React documentation. A great place to start for learning React, or to refresh your knowledge.",
    link: "https://react.dev/"
  },
  {
    title: "Tailwind CSS",
    description: "A utility-first CSS framework for rapidly building custom designs. The official documentation is a great resource for learning and reference.",
    link: "https://tailwindcss.com/docs"
  },
  {
    title: "Figma",
    description: "A collaborative interface design tool. Great for designing UI, creating prototypes, and handing off designs to developers.",
    link: "https://www.figma.com/"
  },
  {
    title: "Vercel",
    description: "A platform for frontend developers, providing the tools and infrastructure to build, ship, and scale modern web applications.",
    link: "https://vercel.com/"
  },
    {
    title: "GitHub",
    description: "A web-based hosting service for version control using Git. It is mostly used for computer code. It offers all of the distributed version control and source code management (SCM) functionality of Git as well as adding its own features.",
    link: "https://github.com/"
  }
];

export default function ResourcesPage() {
  return (
    <div className="container mx-auto p-4">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary">Resources</h1>
        <p className="text-lg text-muted-foreground mt-2">A curated list of tools and documentation to help you build better projects.</p>
      </header>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <a href={resource.link} key={resource.title} target="_blank" rel="noopener noreferrer" className="no-underline">
            <Card className="h-full hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle>{resource.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{resource.description}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
