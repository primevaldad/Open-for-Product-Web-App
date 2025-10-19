// src/app/(app)/learning/[pathId]/page.tsx
import Link from "next/link";

interface PageProps {
  params: Promise<{ pathId: string }>;
}

export default async function LearningPathPage({ params }: PageProps) {
  const { pathId } = await params;

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Learning Path: {pathId}</h1>
      <p>This is the overview page for this path.</p>

      <Link href={`/learning/${pathId}/example-module`}>
        Go to Example Module →
      </Link>
    </div>
  );
}
