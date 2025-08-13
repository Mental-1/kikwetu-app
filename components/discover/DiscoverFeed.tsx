"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearch } from "@/hooks/useSearch";
import FeedItem, { FeedMedia } from "./FeedItem";
import { useSearchParams } from "next/navigation";
import { ArrowDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from "@/utils/debounce";
import React, { Suspense } from "react";

const ErrorModal = React.lazy(() => import("./ErrorModal"));

const PULL_THRESHOLD = 100;

const DiscoverFeed = () => {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active item tracking
  const [activeIndex, setActiveIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (err) => {
          console.warn("Geolocation unavailable:", err);
          setUserLocation(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }
  }, []);

  const {
    data,
    error,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useSearch({
    filters: {
      categories: [],
      subcategories: [],
      conditions: [],
      priceRange: { min: 0, max: 1000000 },
      maxDistance: 100,
      searchQuery,
    },
    sortBy: "newest",
    userLocation,
    pageSize: 5,
  });

  const allListings = data?.pages.flatMap((page) => page.data) ?? [];

  // Scroll handler to detect which item is in view
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let newActiveIndex = 0;
    let minDistance = Infinity;

    // Find which item is closest to center
    itemsRef.current.forEach((item, index) => {
      if (!item) return;

      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.top + itemRect.height / 2;
      const distance = Math.abs(itemCenter - containerCenter);

      if (distance < minDistance) {
        minDistance = distance;
        newActiveIndex = index;
      }
    });

    if (newActiveIndex !== activeIndex) {
      setActiveIndex(newActiveIndex);

      // Trigger pagination when near the end
      if (
        newActiveIndex >= allListings.length - 2 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    }

    // Clear scrolling state after a delay
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [
    activeIndex,
    allListings.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]); // Removed isScrolling from dependencies

  const debouncedHandleScroll = useMemo(
    () => debounce(handleScroll, 50),
    [handleScroll]
  );

  // Clear any pending scroll callbacks when unmounting
  useEffect(() => {
    return () => {
      debouncedHandleScroll.cancel?.();
    };
  }, [debouncedHandleScroll]);

  // Snap to nearest item when scrolling stops
  const snapToNearestItem = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const containerHeight = container.clientHeight;
    const scrollTop = container.scrollTop;
    const nearestIndex = Math.round(scrollTop / containerHeight);
    const targetScrollTop = nearestIndex * containerHeight;

    container.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    });

    setActiveIndex(nearestIndex);
  }, []);

  // Set up scroll listeners
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollEndTimer: ReturnType<typeof setTimeout>;

    const onScroll = () => {
      setIsScrolling(true);
      debouncedHandleScroll(); // Use the debounced version

      // Snap to nearest item when scrolling stops
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(() => {
        snapToNearestItem();
      }, 200);
    };

    container.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", onScroll);
      clearTimeout(scrollEndTimer);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [debouncedHandleScroll, snapToNearestItem]); // Updated dependencies

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (
      scrollContainerRef.current &&
      scrollContainerRef.current.scrollTop === 0
    ) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPulling) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    if (distance > 0) {
      e.preventDefault();
      setPullDistance(distance);
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling) {
      setIsPulling(false);
      if (pullDistance > PULL_THRESHOLD) {
        setIsRefreshing(true);
        try {
          await refetch();
          // Reset to first item after refresh
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
            setActiveIndex(0);
          }
        } catch (err) {
          console.error("Pull to refresh failed:", err);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    }
  };

  useEffect(() => {
    if (!isRefreshing) {
      setPullDistance(0);
    }
  }, [isRefreshing]);

  // Navigate to specific item
  const navigateToItem = useCallback(
    (index: number) => {
      if (
        !scrollContainerRef.current ||
        index < 0 ||
        index >= allListings.length
      )
        return;

      const container = scrollContainerRef.current;
      const targetScrollTop = index * container.clientHeight;

      container.scrollTo({
        top: targetScrollTop,
        behavior: "smooth",
      });

      setActiveIndex(index);
    },
    [allListings.length, scrollContainerRef], // Added scrollContainerRef to dependencies
  );

  // Keyboard navigation for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return; // Don't interfere with form inputs
      }

      switch (e.key) {
        case "ArrowDown":
        case "j": // Vim-style navigation
          e.preventDefault();
          navigateToItem(Math.min(activeIndex + 1, allListings.length - 1));
          break;
        case "ArrowUp":
        case "k": // Vim-style navigation
          e.preventDefault();
          navigateToItem(Math.max(activeIndex - 1, 0));
          break;
        case " ": // Spacebar
          e.preventDefault();
          navigateToItem(Math.min(activeIndex + 1, allListings.length - 1));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, allListings.length, navigateToItem]); // Added navigateToItem to dependencies

  if (isLoading && !data) {
    return (
      <div className="h-screen w-full flex justify-center items-center bg-black">
        <div className="flex gap-2">
          <div className="w-4 h-4 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-4 h-4 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-4 h-4 rounded-full bg-primary animate-bounce"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Suspense fallback={null}>
        <ErrorModal onRetry={() => window.location.reload()} />
      </Suspense>
    );
  }

  return (
    <div className="h-screen w-full flex justify-center bg-black relative overflow-hidden">
      {/* Pull to refresh indicator */}
      {isPulling && (
        <div
          className="absolute top-0 left-0 w-full flex justify-center items-center text-white z-50"
          style={{
            height:
              pullDistance > PULL_THRESHOLD ? PULL_THRESHOLD : pullDistance,
          }}
        >
          {isRefreshing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <ArrowDown
              className={cn(
                "h-6 w-6 transition-transform duration-200",
                pullDistance > PULL_THRESHOLD && "rotate-180",
              )}
            />
          )}
        </div>
      )}

      {/* Main scroll container - hidden scrollbar */}
      <div
        ref={scrollContainerRef}
        className="relative h-full w-full md:w-[600px] lg:w-[700px] overflow-y-auto snap-y snap-mandatory"
        style={{
          scrollBehavior: isScrolling ? "auto" : "smooth",
          paddingTop: isPulling ? pullDistance : 0,
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE/Edge
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Render all listings */}
        {allListings.map((listing, index) => (
          <div
            key={listing.id}
            ref={(el) => {
              itemsRef.current[index] = el;
            }}
            className="h-screen w-full snap-start snap-always flex-shrink-0 animate-fade-in-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <FeedItem
              item={{
                id: listing.id,
                type: "image", // Assuming image for now
                src: listing.images?.[0] || "/placeholder.svg",
                avatar: listing.seller_avatar || "/placeholder-user.jpg",
                username: listing.seller_username || "Unknown User",
                seller_id: listing.user_id || '',
                tags: [], // Placeholder for now
                gallery: listing.images || undefined,
                title: listing.title,
                description: listing.description,
                price: listing.price,
                location: listing.location,
              }}
            />
          </div>
        ))}

        {/* Loading indicator for next page */}
        {isFetchingNextPage && (
          <div className="h-screen w-full flex justify-center items-center">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce"></div>
            </div>
          </div>
        )}
      </div>

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded text-xs z-50">
          Active: {activeIndex} / {allListings.length}
        </div>
      )}
    </div>
  );
};

export default DiscoverFeed;
