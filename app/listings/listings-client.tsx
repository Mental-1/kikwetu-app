"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useSearch } from "@/hooks/useSearch";
import { ListingCard } from "@/components/listings/listing-card";
import { SearchFilters } from "@/lib/types/search";
import { PAGE_SIZE } from "@/lib/search-utils";

import { useSearchState } from "@/hooks/useSearchState";

export function ListingsClient({ initialFilters, initialSortBy }: { initialFilters: SearchFilters, initialSortBy: string }) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const { filters, sortBy } = useSearchState();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSearch({
    filters,
    sortBy,
    userLocation,
    pageSize: PAGE_SIZE,
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
      );
    }
  }, []);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    });

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const listings = useMemo(() => data?.pages.slice(1).flatMap((page) => page.data) || [], [data]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
      <div ref={loadingRef} className="flex justify-center py-8">
        {isFetchingNextPage && <p>Loading more...</p>}
      </div>
      {!hasNextPage && listings.length > 0 && <p className="text-center text-muted-foreground">No more listings</p>}
    </>
  );
}
