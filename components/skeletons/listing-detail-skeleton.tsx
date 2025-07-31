import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Renders a skeleton placeholder for the listing detail page while content is loading.
 *
 * Displays a static layout of skeleton elements that mimic the structure of the listing detail view, including header, image gallery, description, details, seller information, and action buttons.
 */
export function ListingDetailSkeleton() {
  return (
    <div className="container py-8">
      <div className="mb-6">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <div className="flex items-center mt-2">
          <Skeleton className="h-4 w-32 mr-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          {/* Image gallery skeleton */}
          <div className="relative rounded-lg overflow-hidden">
            <div className="aspect-video relative">
              <Skeleton className="absolute inset-0" />
            </div>
          </div>

          {/* Description skeleton */}
          <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>

          {/* Details skeleton */}
          <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Seller info skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Skeleton className="h-16 w-16 rounded-full mb-4" />
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-48 mb-4" />
                <div className="flex gap-2 w-full mt-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
