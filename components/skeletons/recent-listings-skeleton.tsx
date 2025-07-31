import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export const RecentListingCardSkeleton = () => {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden border-0 animate-pulse">
      <CardContent className="p-0">
        <div className="aspect-square bg-gray-300 dark:bg-gray-700"></div>
        <div className="p-3">
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-full mb-1"></div>
          <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-5/6 mb-2"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-16 bg-gray-300 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-16 bg-gray-300 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const RecentListingsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <RecentListingCardSkeleton key={i} />
      ))}
    </div>
  );
};
