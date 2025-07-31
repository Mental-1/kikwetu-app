import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoriesSkeleton({ count = 23 }: { count?: number } = {}) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-0 bg-muted/50">
          <CardContent className="p-3 text-center">
            <Skeleton className="h-8 w-8 mx-auto mb-1" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
