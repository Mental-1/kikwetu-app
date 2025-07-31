import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ListingsItem } from "@/lib/types/listing";

export function ListingCard({ listing }: { listing: ListingsItem }) {
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
            <h3 className="font-medium text-base mb-1 truncate">
              {listing.title}
            </h3>
            <p className="text-lg font-bold text-green-600 mb-1">
              Ksh {formatPrice(listing.price)}
            </p>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
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
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
