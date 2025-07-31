import dynamic from 'next/dynamic';

const ListingsFilter = dynamic(() => import('@/components/listings-filter').then(mod => mod.ListingsFilter), { ssr: false });
import { SearchService } from "@/lib/services/search-service";
import { parseSearchParams, PAGE_SIZE } from "@/lib/search-utils";
import { ListingCard } from "@/components/listings/listing-card";
import { ListingsClient } from "./listings-client";

export default async function ListingsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const filters = parseSearchParams(new URLSearchParams(searchParams as any));
  const sortBy = (searchParams.sortBy as string) || "newest";

  const initialListings = await SearchService.getFilteredListings({
    page: 1,
    pageSize: PAGE_SIZE,
    filters,
    sortBy,
    userLocation: null,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <ListingsFilter />
          <div className="flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {initialListings.data.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
            <ListingsClient initialFilters={filters} initialSortBy={sortBy} />
          </div>
        </div>
      </div>
    </div>
  );
}
