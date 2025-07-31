import { SearchService } from "@/lib/services/search-service";
import { parseSearchParams, PAGE_SIZE } from "@/lib/search-utils";
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
        <ListingsClient initialListings={initialListings} />
      </div>
    </div>
  );
}