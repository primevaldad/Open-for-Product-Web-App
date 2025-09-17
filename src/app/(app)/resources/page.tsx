
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Free Resources</h1>
      <p className="text-lg text-muted-foreground">
        A collection of tools and resources to help you make the most of Open for Product.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Resource One</CardTitle>
          </CardHeader>
          <CardContent>
            <p>A great tool to help you with your projects.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Resource Two</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Another great tool to help you with your projects.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Resource Three</CardTitle>
          </CardHeader>
          <CardContent>
            <p>And yet another great tool to help you with your projects.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
