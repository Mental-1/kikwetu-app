"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearch } from "@/hooks/useSearch";
import { FeedItem, FeedMedia } from "./FeedItem";
import DiscoverItem from "./DiscoverItem";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { throttle } from "lodash";
import React, { Suspense } from "react";

const ErrorModal = React.lazy(() => import("./ErrorModal"));

const PULL_THRESHOLD = 100;

const DiscoverFeed = () => {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const [activeIndex, setActiveIndex] = useState(0);

  const allListings = data?.pages.flatMap((page) => page.data) ?? [];

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
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

  const setActiveIndexThrottled = useRef(
    throttle((index: number) => {
      setActiveIndex(index);
    }, 100)
  ).current;

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
    <div className="h-screen w-full flex justify-center bg-black">
      <div
        ref={scrollContainerRef}
        className="relative h-full w-full md:w-[400px] lg:w-[470px] overflow-y-auto snap-y snap-mandatory"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isPulling && (
          <div
            className="absolute top-0 left-0 w-full flex justify-center items-center text-white"
            style={{ height: pullDistance > PULL_THRESHOLD ? PULL_THRESHOLD : pullDistance }}
          >
            {isRefreshing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <ArrowDown
                className={cn("h-6 w-6 transition-transform duration-200", pullDistance > PULL_THRESHOLD && "rotate-180")}
              />
            )}
          </div>
        )}
        <AnimatePresence initial={false}>
          {allListings.map((listing, index) => (
            index >= activeIndex - 1 && index <= activeIndex + 1 ? (
              <motion.div
                key={listing.id}
                className="absolute h-full w-full"
                initial={{ y: "100%" }}
                animate={{ y: `${(index - activeIndex) * 100}%` }}
                exit={{ y: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onViewportEnter={() => {
                    if(index > activeIndex) setActiveIndexThrottled(index);
                    if (index === allListings.length - 1 && hasNextPage && !isFetchingNextPage) {
                        fetchNextPage();
                    }
                }}
              >
                <FeedItem item={{
                  id: listing.id,
                  type: "image", // Assuming image for now
                  src: listing.images?.[0] || "/placeholder.svg",
                  avatar: listing.seller_avatar || "/placeholder-user.jpg",
                  username: listing.seller_username || "Unknown User",
                  tags: [], // Placeholder for now
                  gallery: listing.images || undefined,
                  title: listing.title,
                  description: listing.description,
                  price: listing.price,
                  location: listing.location,
                }} />
              </motion.div>
            ) : null
          ))}
        </AnimatePresence>
        {isFetchingNextPage && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-3 h-3 rounded-full bg-primary animate-bounce"></div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default DiscoverFeed;
