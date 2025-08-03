'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { useSearchState } from '@/hooks/useSearchState';
import { ListingCard } from '@/components/listings/listing-card';
import { ListingsFilter } from '@/components/listings-filter';
import { PAGE_SIZE } from '@/lib/search-utils';
import { ListingsPageSkeleton } from '@/components/skeletons/listings-page-skeleton';

export function ListingsClient() {
  const { filters, sortBy } = useSearchState();
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useSearch({
    filters,
    sortBy,
    userLocation,
    pageSize: PAGE_SIZE,
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      });
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

  const allListings = useMemo(() => data?.pages.flatMap((page) => page.data) || [], [data]);

  if (isLoading) {
    return <ListingsPageSkeleton />;
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <ListingsFilter />
      <div className="flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
        <div ref={loadingRef} className="flex justify-center py-8">
          {isFetchingNextPage && <p>Loading more...</p>}
        </div>
        {!hasNextPage && allListings.length > 0 && (
          <p className="text-center text-muted-foreground">No more listings</p>
        )}
      </div>
    </div>
  );
}
