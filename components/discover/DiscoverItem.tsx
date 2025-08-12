"use client";

import ImageCarousel from "./ImageCarousel";
import LeftOverlay from "./LeftOverlay";
import RightOverlay from "./RightOverlay";
import TopOverlay from "./TopOverlay";

const DiscoverItem = ({ listing }: { listing: any }) => {
  return (
    <div className="relative h-full w-full snap-start">
      <ImageCarousel images={listing.images} />
      <div className="absolute inset-0 bg-black bg-opacity-20 z-10 pointer-events-none"></div>
      <div className="relative z-20 h-full">
        <TopOverlay />
        <LeftOverlay username={listing.seller_username} tags={listing.tags || []} />
        <RightOverlay sellerId={listing.user_id} sellerAvatar={listing.seller_avatar} />
      </div>
    </div>
  );
};

export default DiscoverItem;