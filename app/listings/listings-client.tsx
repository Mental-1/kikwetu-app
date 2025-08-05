'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSearch } from '@/hooks/useSearch';
import { useSearchState } from '@/hooks/useSearchState';
import { ListingCard } from '@/components/listings/listing-card';
import { ListingsFilter } from '@/components/listings-filter';
import { PAGE_SIZE } from '@/lib/search-utils';
import { ListingsPageSkeleton } from '@/components/skeletons/listings-page-skeleton';
import { Grid, List, MapPin, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ListingsClient() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('category');
  const { filters, sortBy, updateFilters, clearFilters, updateSortBy } =
    useSearchState();
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    if (categoryId) {
      updateFilters({ categories: [parseInt(categoryId, 10)] });
    }
  }, [categoryId, updateFilters]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useSearch({
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

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > window.innerHeight * 2);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const allListings = useMemo(
    () => data?.pages.flatMap((page) => page.data) || [],
    [data],
  );

  if (isLoading) {
    return <ListingsPageSkeleton />;
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <ListingsFilter
        filters={filters}
        updateFilters={updateFilters}
        clearFilters={clearFilters}
      />
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Listings</h1>
            <p className="text-sm text-muted-foreground">
              {allListings.length} results
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={updateSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="distance">Distance</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="rounded-none rounded-l-md"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="rounded-none rounded-r-md"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {allListings.map((listing) => (
              <div key={listing.id} className="mb-4">
                <ListingCard listing={listing} layout="list" />
              </div>
            ))}
          </div>
        )}

        <div ref={loadingRef} className="flex justify-center py-8">
          {isFetchingNextPage && <p>Loading more...</p>}
        </div>
        {!hasNextPage && allListings.length > 0 && (
          <p className="text-center text-muted-foreground">No more listings</p>
        )}
      </div>
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg animate-in fade-in duration-200"
          aria-label="Back to top"
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
