"use client";

import { useState, useEffect } from "react";
import { useSearch } from "@/hooks/useSearch";
import DiscoverItem from "./DiscoverItem";
import ErrorModal from "./ErrorModal";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";

const DiscoverFeed = () => {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

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
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
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

  if (error) {
    return <ErrorModal onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="h-screen w-full flex justify-center bg-black">
      <div className="relative h-full w-full md:w-[400px] lg:w-[470px] overflow-hidden">
        <AnimatePresence initial={false}>
          {allListings.map((listing, index) => (
            index >= activeIndex - 2 && index <= activeIndex + 2 ? (
              <motion.div
                key={listing.id}
                className="absolute h-full w-full"
                initial={{ y: "100%" }}
                animate={{ y: `${(index - activeIndex) * 100}%` }}
                exit={{ y: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onViewportEnter={() => {
                    if(index > activeIndex) setActiveIndex(index);
                    if (index === allListings.length - 2 && hasNextPage && !isFetchingNextPage) {
                        fetchNextPage();
                    }
                }}
              >
                <DiscoverItem listing={listing} />
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
