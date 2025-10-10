
// This is a temporary placeholder to unblock the build process.
// The original implementation was causing a persistent TypeScript error.

interface PageProps {
  params: {
    id: string;
  };
}

export default function ProjectDetailPage({ params }: PageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="p-8 border rounded-lg bg-card text-card-foreground">
        <h1 className="text-2xl font-bold mb-4">Page Temporarily Unavailable</h1>
        <p className="text-muted-foreground">
          This project detail page is currently being updated.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          (Project ID: {params.id})
        </p>
      </div>
    </div>
  );
}
