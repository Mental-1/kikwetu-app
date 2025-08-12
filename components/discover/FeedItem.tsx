import React from "react";
import { Search, Plus, Heart, Star, MessageCircle, Share2, Bookmark, X, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";


export interface FeedMedia {
  id: string;
  type: "video" | "image";
  src: string;
  poster?: string;
  avatar?: string;
  username: string;
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
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ label, active, onClick, children }) => (
  <button
    aria-label={label}
    onClick={onClick}
    className={`flex flex-col items-center gap-1 hover-scale focus:outline-none`}
  >
    <div className={`rounded-full p-3 border bg-background/40 border-border backdrop-blur-sm transition`}>{children}</div>
    <span className={`text-xs text-foreground/80`}>{label}</span>
  </button>
);

const Hashtags: React.FC<{ tags: string[] }> = ({ tags }) => {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? tags : tags.slice(0, 3);

  return (
    <div className="flex flex-wrap items-center gap-2 max-w-[80vw] md:max-w-[60vw]">
      {visible.map((tag) => (
        <button key={tag} className="text-sm text-primary story-link" aria-label={`View tag ${tag}`}>
          {tag}
        </button>
      ))}
      {tags.length > 3 && (
        <button
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

const GalleryIndicators: React.FC<{ count: number; current: number }> = ({ count, current }) => {
  if (count <= 1) return null;
  return (
    <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full transition ${i === current ? "bg-primary" : "bg-background/60 border border-border"}`}
          aria-label={`Go to image ${i + 1}`}
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
    <div className="absolute top-4 left-4 right-4 md:right-auto md:w-96 z-30 animate-enter">
      <div className="relative">
        <Input placeholder="Search products, tags, stores..." className="pl-10" aria-label="Search" />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
        <button onClick={onClose} aria-label="Close search" className="absolute right-3 top-1/2 -translate-y-1/2">
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
  const touchStartXRef = React.useRef<number | null>(null);

  return (
    <article className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      <Link href={`/listings/${item.id}`} className="absolute inset-0 z-10" aria-label={`View ${item.title}`}></Link>
      {/* Background media */}
      {item.type === "video" ? (
        <video
          className="absolute inset-0 h-full w-full object-cover md:rounded-xl"
          src={item.src}
          poster={item.poster}
          playsInline
          muted
          loop
          autoPlay
        />
      ) : item.gallery && item.gallery.length > 0 ? (
        <div
          className="absolute inset-0 h-full w-full overflow-hidden md:rounded-xl"
          onTouchStart={(e) => {
            touchStartXRef.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            const endX = e.changedTouches[0].clientX;
            const startX = touchStartXRef.current ?? endX;
            const diff = startX - endX;
            if (Math.abs(diff) > 50) {
              setGalleryIndex((prev) => {
                const next = diff > 0 ? prev + 1 : prev - 1;
                return Math.max(0, Math.min(next, item.gallery!.length - 1));
              });
            }
            touchStartXRef.current = null;
          }}
        >
          <div
            className="flex h-full w-full transition-transform duration-300"
            style={{ transform: `translateX(-${galleryIndex * 100}%)` }}
          >
            {item.gallery.map((image, idx) => (
              <Image
                key={idx}
                src={image}
                alt={`${item.username} gallery image ${idx + 1}`}
                loading="lazy"
                className="h-full w-full object-cover shrink-0 grow-0 basis-full"
                fill
              />
            ))}
          </div>
          <GalleryIndicators count={item.gallery.length} current={galleryIndex} />
        </div>
      ) : (
        <Image
          src={item.src}
          alt={`${item.username} product preview`}
          className="absolute inset-0 h-full w-full object-cover md:rounded-xl"
          loading="lazy"
          fill
        />
      )}

      {/* subtle gradient overlay for readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/30 md:rounded-xl" />

      {/* Search trigger top-left */}
      <button
        onClick={() => setSearchOpen(true)}
        aria-label="Open search"
        className="absolute top-4 left-4 z-30 rounded-full p-2 border bg-background/50 border-border backdrop-blur-sm hover-scale"
      >
        <Search className="h-5 w-5" />
      </button>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Avatar with follow badge - top-right of avatar */}
      <div className="absolute bottom-28 right-4 md:bottom-32 z-20 flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar className="h-14 w-14 ring-2 ring-background/50 shadow">
            <AvatarImage src={item.avatar} alt={`${item.username} avatar`} />
            <AvatarFallback>{item.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => setFollowing((v) => !v)}
            aria-label={following ? "Following" : "Follow"}
            className="absolute -bottom-1 -right-1 rounded-full p-1 bg-primary text-primary-foreground shadow"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4">
          <ActionButton label={liked ? "Liked" : "Like"} onClick={() => setLiked((v) => !v)}>
            <Heart className={`h-5 w-5 ${liked ? "fill-current text-primary" : ""}`} />
          </ActionButton>
          <ActionButton label="Review">
            <Star className="h-5 w-5" />
          </ActionButton>
          <ActionButton label="Message">
            <MessageCircle className="h-5 w-5" />
          </ActionButton>
          <ActionButton label="Share">
            <Share2 className="h-5 w-5" />
          </ActionButton>
          <ActionButton label={saved ? "Saved" : "Save"} onClick={() => setSaved((v) => !v)}>
            <Bookmark className={`h-5 w-5 ${saved ? "fill-current text-primary" : ""}`} />
          </ActionButton>
        </div>
      </div>

      {/* Bottom-left info: hashtags */}
      <div className="absolute bottom-6 left-4 right-28 md:right-40 z-20 space-y-2">
        <p className="text-sm text-foreground/90">@{item.username}</p>
        <Hashtags tags={item.tags} />
      </div>
    </article>
  );
};

export default FeedItem;
