'use client';

import React, { Suspense } from "react";

const LazyMessageAction = React.lazy(() => import('@/components/common/LazyMessageAction'));
import {
  Search,
  Plus,
  Heart,
  Star,
  MessageCircle,
  Share2,
  Bookmark,
  X,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface FeedMedia {
  id: string;
  type: "video" | "image";
  src: string;
  poster?: string;
  avatar?: string;
  username: string;
  seller_id: string; // Added seller_id
  tags: string[];
  gallery?: string[]; // optional gallery for image carousels
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
}

const ActionButton: React.FC<{
  label: string;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}> = ({ label, active, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className={`flex flex-col items-center gap-1 hover:scale-110 transition-transform focus:outline-none`}
  >
    <div
      className={`rounded-full p-3 border bg-background/40 border-border backdrop-blur-sm transition`}
    >
      {children}
    </div>
    <span className={`text-xs text-foreground/80`}>{label}</span>
  </button>
);

const Hashtags: React.FC<{ tags: string[] }> = ({ tags }) => {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? tags : tags.slice(0, 3);

  return (
    <div className="flex flex-wrap items-center gap-2 max-w-[80vw] md:max-w-[60vw]">
      {visible.map((tag) => (
        <Link
          key={tag}
          href={`/discover?search=${encodeURIComponent(tag)}`}
          className="text-sm text-primary story-link"
          aria-label={`View tag ${tag}`}
        >
          {tag}
        </Link>
      ))}
      {tags.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-sm text-foreground/80 underline hover:text-foreground"
          aria-label={expanded ? "Show less" : "Show more tags"}
        >
          {expanded ? "less" : `+${tags.length - 3} more`}
        </button>
      )}
    </div>
  );
};

const GalleryIndicators: React.FC<{ count: number; current: number }> = ({
  count,
  current,
}) => {
  if (count <= 1) return null;
  return (
    <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <span
          aria-hidden="true"
          key={i}
          className={`h-2 w-2 rounded-full transition ${i === current ? "bg-primary" : "bg-background/60 border border-border"}`}
        />
      ))}
    </div>
  );
};

const SearchOverlay: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="absolute top-4 left-4 right-4 md:right-auto md:w-96 z-30 animate-in fade-in-0 slide-in-from-top-2 duration-200">
      <div className="relative">
        <Input
          placeholder="Search products, tags, stores..."
          className="pl-10"
          aria-label="Search"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
        <button
          onClick={onClose}
          aria-label="Close search"
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <X className="h-4 w-4 text-foreground/70" />
        </button>
      </div>
    </div>
  );
};

const FeedItem: React.FC<{ item: FeedMedia }> = ({ item }) => {
  const isMobile = useIsMobile();
  const [liked, setLiked] = React.useState(false);
  const [reviewed, setReviewed] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [following, setFollowing] = React.useState(false);
  const [galleryIndex, setGalleryIndex] = React.useState(0);
  const [isVideoPaused, setIsVideoPaused] = React.useState(false);
  const touchStartXRef = React.useRef<number | null>(null);
  const touchStartTimeRef = React.useRef<number | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const { toast } = useToast();

  const TAP_THRESHOLD_MS = 200;
  const SWIPE_THRESHOLD_PX = 50;

  const nextImage = React.useCallback(() => {
    if (!item.gallery || item.gallery.length <= 1) return;
    setGalleryIndex((prev) => (prev + 1) % item.gallery!.length);
  }, [item.gallery]);

  const prevImage = React.useCallback(() => {
    if (!item.gallery || item.gallery.length <= 1) return;
    setGalleryIndex(
      (prev) => (prev - 1 + item.gallery!.length) % item.gallery!.length,
    );
  }, [item.gallery]);

  // Keyboard navigation for gallery (desktop only)
  React.useEffect(() => {
    if (isMobile || !item.gallery || item.gallery.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle gallery navigation if this is the focused element or no input is focused
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          prevImage();
          break;
        case "ArrowRight":
          e.preventDefault();
          nextImage();
          break;
      }
    };

    // Add event listener when component mounts
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, item.gallery, nextImage, prevImage]);

  // Mobile touch handlers for gallery
  const handleTouchStart = (e: React.TouchEvent) => {
    if (item.gallery && item.gallery.length > 1) {
      touchStartXRef.current = e.touches[0].clientX;
    }
    if (item.type === "video") {
      touchStartTimeRef.current = Date.now();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - (touchStartTimeRef.current || 0);

    if (item.type === "video" && touchDuration < TAP_THRESHOLD_MS) { // Tap to pause
      if (videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play();
          setIsVideoPaused(false);
        } else {
          videoRef.current.pause();
          setIsVideoPaused(true);
        }
      }
    } else if (item.gallery && item.gallery.length > 1 && touchStartXRef.current) { // Swipe to navigate
      const endX = e.changedTouches[0].clientX;
      const diff = touchStartXRef.current - endX;

      if (Math.abs(diff) > SWIPE_THRESHOLD_PX) {
        if (diff > 0) {
          nextImage();
        } else {
          prevImage();
        }
      }
    }

    touchStartXRef.current = null;
    touchStartTimeRef.current = null;
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item?.title,
          text: item?.description || "",
          url,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied",
          description: "Listing link copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <article
      className="relative h-[calc(100vh-64px)] w-full overflow-hidden flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background media */}
      {item.type === "video" ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-contain md:rounded-xl"
          src={item.src}
          poster={item.poster}
          playsInline
          muted
          loop
          autoPlay
          onClick={() => {
            if (videoRef.current) {
              if (videoRef.current.paused) {
                videoRef.current.play();
                setIsVideoPaused(false);
              } else {
                videoRef.current.pause();
                setIsVideoPaused(true);
              }
            }
          }}
        />
        {item.type === "video" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {isVideoPaused && <span className="rounded bg-black/60 px-3 py-1 text-white text-sm">Paused</span>}
          </div>
        )}
      ) : item.gallery && item.gallery.length > 0 ? (
        <div
          className="absolute inset-0 h-full w-full overflow-hidden md:rounded-xl z-[15]"
        >
          <div
            className="flex h-full w-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${galleryIndex * 100}%)` }}
          >
            {item.gallery.map((image, idx) => (
              <div
                key={idx}
                className="relative h-full w-full shrink-0 grow-0 basis-full"
              >
                <Image
                  src={image}
                  alt={`${item.username} gallery image ${idx + 1}`}
                  fill
                  className="object-contain"
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              </div>
            ))}
          </div>

          {/* Desktop-only gallery navigation buttons */}
          {!isMobile && item.gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 rounded-full p-3 bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 rounded-full p-3 bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <GalleryIndicators
            count={item.gallery.length}
            current={galleryIndex}
          />
        </div>
      ) : (
        <Image
          src={item.src}
          alt={`${item.username} product preview`}
          fill
          className="absolute inset-0 h-full w-full object-contain md:rounded-xl"
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 600px"
        />
      )}

      {/* Subtle gradient overlay for readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 md:rounded-xl" />

      {/* Search trigger top-left */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSearchOpen(true);
        }}
        aria-label="Open search"
        className="absolute top-4 left-4 z-30 rounded-full p-2 border bg-black/50 border-border backdrop-blur-sm hover:scale-110 transition-transform"
      >
        <Search className="h-5 w-5 text-white" />
      </button>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Avatar with follow badge - top-right of avatar */}
      <div className="absolute bottom-[calc(64px+1rem)] right-4 md:bottom-32 z-20 flex flex-col items-center gap-4">
        <div className="relative">
          <Link href={`/seller/${item.seller_id}`} className="block">
            <Avatar className="h-14 w-14 ring-2 ring-white/50 shadow">
              <AvatarImage src={item.avatar} alt={`${item.username} avatar`} />
              <AvatarFallback>
                {item.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setFollowing((v) => !v);
            }}
            aria-label={following ? "Following" : "Follow"}
            className="absolute -bottom-1 -right-1 rounded-full p-1 bg-primary text-primary-foreground shadow hover:scale-110 transition-transform"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4">
          <ActionButton
            label={liked ? "Liked" : "Like"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLiked((v) => !v);
            }}
          >
            <Heart
              className={`h-5 w-5 ${liked ? "fill-current text-red-500" : ""}`}
            />
          </ActionButton>
          <ActionButton label="Review">
            <Star className="h-5 w-5" />
          </ActionButton>
          <Suspense fallback={null}>
            <LazyMessageAction
              sellerId={item.seller_id}
              listingId={item.id}
              renderButton={(onClick) => (
                <ActionButton label="Message" onClick={onClick}>
                  <MessageCircle className="h-5 w-5" />
                </ActionButton>
              )}
            />
          </Suspense>
          <ActionButton label="Share" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </ActionButton>
          <ActionButton
            label={saved ? "Saved" : "Save"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSaved((v) => !v);
            }}
          >
            <Bookmark
              className={`h-5 w-5 ${saved ? "fill-current text-primary" : ""}`}
            />
          </ActionButton>
        </div>
      </div>

      {/* Bottom-left info: hashtags */}
      <div className="absolute bottom-[calc(64px+1rem)] left-4 right-28 md:right-40 z-20 space-y-2 text-white">
        <p className="text-base text-white/90">@{item.username}</p>
        <Hashtags tags={item.tags} />

        {/* Product info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/listings/${item.id}`}
              aria-label={`View listing ${item.title}`}
            >
              <h3 className="text-lg font-semibold line-clamp-1">
                {item.title}
              </h3>
            </Link>
            {item.price !== null && item.price !== undefined && (
              <p className="text-lg font-bold flex-shrink-0 text-green-500">
                Ksh {item.price.toLocaleString()}
              </p>
            )}
          </div>
          {item.location && (
            <div className="flex items-center gap-1 text-sm text-white/70">
              <MapPin className="h-4 w-4" />
              <span>{item.location}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default FeedItem;
