import { Suspense } from "react";
import { ListingDetailSkeleton } from "@/components/skeletons/listing-detail-skeleton";
import { getListingById } from "@/lib/data/listings";
import { ListingDetailsClient } from "./listing-details-client";

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const listing = await getListingById(params.id);

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container px-4 py-6">
          <p>Listing not found.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<ListingDetailSkeleton />}>
      <ListingDetailsClient listing={listing} />
    </Suspense>
  );
}
