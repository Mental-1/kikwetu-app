import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

interface ListingCardSkeletonProps {
  layout?: "grid" | "list"
}

/**
 * Renders a skeleton placeholder for a listing card in either grid or list layout.
 *
 * Displays a loading UI that mimics the structure of a listing card, with different arrangements for "grid" and "list" layouts.
 *
 * @param layout - The layout variant for the skeleton, either "grid" or "list". Defaults to "grid".
 * @returns A React element representing the skeleton placeholder for the specified layout.
 */
export function ListingCardSkeleton({ layout = "grid" }: ListingCardSkeletonProps) {
  if (layout === "list") {
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/4 lg:w-1/5">
            <Skeleton className="h-48 w-full md:h-full" />
          </div>
          <CardContent className="flex-1 p-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="mt-2 flex items-center">
                  <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="mt-4 text-right md:ml-4 md:mt-0">
                <Skeleton className="h-8 w-24 ml-auto" />
                <Skeleton className="h-6 w-16 ml-auto mt-2" />
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="aspect-[4/3] relative">
        <Skeleton className="absolute inset-0" />
      </div>
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="mb-2 flex items-start justify-between">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/4 ml-2" />
        </div>
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <div className="mt-auto flex items-center">
          <Skeleton className="h-3 w-3 mr-1 rounded-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </CardContent>
    </Card>
  )
}
