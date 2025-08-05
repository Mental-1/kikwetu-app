"use client";

import React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DisplayListingItem } from "@/lib/types/listing";
import Image from "next/image";
import { formatPriceWithCurrency } from "@/lib/currency-converter";

interface RecentListingsProps {
  initialListings: DisplayListingItem[];
}

export function RecentListings({ initialListings }: RecentListingsProps) {
  if (!initialListings || initialListings.length === 0) {
    return (
      <div className="col-span-full text-center py-8 text-muted-foreground">
        No listings found.
      </div>
    );
  }

  return (
    <>
      {initialListings.map((listing: DisplayListingItem) => (
        <Link key={listing.id} href={`/listings/${listing.id}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden border-0">
            <CardContent className="p-0">
              <div className="aspect-square bg-muted">
                <Image
                  src={
                    Array.isArray(listing.images)
                      ? listing.images[0] || "/placeholder.svg"
                      : listing.images || "/placeholder.svg"
                  }
                  alt={listing.title}
                  width={200}
                  height={200}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <h3 className="font-medium text-base mb-1 truncate">
                  {listing.title}
                </h3>
                <p className="text-lg font-bold text-green-600 mb-1">
                  Ksh {formatPriceWithCurrency(listing.price ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                  {listing.description}
                </p>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {listing.condition}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {listing.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 text-white" />
                    {listing.views}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </>
  );
}

