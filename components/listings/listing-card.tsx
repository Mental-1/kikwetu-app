import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { useState, useEffect } from 'react';
import { formatPrice } from "@/lib/utils";
import { ListingsItem } from "@/lib/types/listing";

interface ListingCardProps {
  listing: ListingsItem;
  layout?: "grid" | "list";
}

export function ListingCard({ listing, layout = "grid" }: ListingCardProps) {
  const [formattedPrice, setFormattedPrice] = useState<string | null>(null);

  useEffect(() => {
    const getFormattedPrice = () => {
      if (listing.price !== undefined && listing.price !== null) {
        const price = formatPrice(listing.price);
        setFormattedPrice(price);
      } else {
        setFormattedPrice("N/A");
      }
    };
    getFormattedPrice();
  }, [listing.price]);

  if (layout === "list") {
    return (
      <Link href={`/listings/${listing.id}`}>
        <Card className="overflow-hidden border hover:shadow-md transition-shadow h-[160px] sm:h-[160px]">
          <CardContent className="p-0 h-full">
            <div className="flex flex-row h-full">
              <div className="w-40 h-full bg-muted flex-shrink-0">
                <Image
                  src={listing.images?.[0] ?? "/placeholder.svg"}
                  alt={listing.title}
                  width={160}
                  height={160}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2 sm:p-4 flex-1 relative">
                <h3 className="font-medium text-sm sm:text-lg truncate mb-1">
                  {listing.title}
                </h3>
                <p className="text-sm sm:text-xl font-bold text-green-600 mb-1">
                  Ksh {formatPrice(listing.price)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 line-clamp-2">
                  {listing.description}
                </p>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {listing.condition}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                    {listing.location}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/listings/${listing.id}`}>
      <Card className="overflow-hidden border-0 hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="aspect-square bg-muted">
            <Image
              src={listing.images?.[0] ?? "/placeholder.svg"}
              alt={listing.title}
              width={200}
              height={200}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-3">
            <h3 className="font-medium text-base sm:text-lg mb-1 truncate">
              {listing.title}
            </h3>
            <p className="text-lg sm:text-xl font-bold text-green-600 mb-1">
              Ksh {formatPrice(listing.price)}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
              {listing.description}
            </p>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs sm:text-sm">
                {listing.condition}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                {listing.location}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
