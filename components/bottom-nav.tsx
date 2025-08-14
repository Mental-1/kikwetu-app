"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, List, Map as MapIcon, Compass, Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/auth-context";

const BottomNavBar = () => {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const router = useRouter();

  const routes = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/",
      icon: <Home className="h-4 w-4" />,
    },
    {
      href: "/discover",
      label: "Discover",
      active: pathname === "/discover" || pathname?.startsWith("/discover/"),
      icon: <Compass className="h-4 w-4" />,
    },
  ];

  const [homeRoute, discoverRoute] = routes;

  const postAdRoute = {
    label: "Post Ad",
    icon: <Plus className="h-4 w-4" />,
    onClick: () => {
      if (user) {
        router.push("/post-ad");
      } else {
        router.push("/auth");
      }
    },
  };

  const listingsRoute = {
    href: "/listings",
    label: "Listings",
    active: pathname === "/listings" || pathname?.startsWith("/listings/"),
    icon: <List className="h-4 w-4" />,
  };

        icon: <Home className="h-4 w-4" />,
    },
    {
      href: "/discover",
      label: "Discover",
      active: pathname === "/discover" || pathname?.startsWith("/discover/"),
      icon: <Compass className="h-4 w-4" />,
    },
  ];

  const [homeRoute, discoverRoute] = routes;

  const postAdRoute = {
    label: "Post Ad",
    icon: <Plus className="h-4 w-4" />,
    onClick: () => {
      if (user) {
        router.push("/post-ad");
      } else {
        router.push("/auth");
      }
    },
  };

  const listingsRoute = {
    href: "/listings",
    label: "Listings",
    active: pathname === "/listings" || pathname?.startsWith("/listings/"),
    icon: <List className="h-4 w-4" />,
  };

  const mapRoute = {
      href: "/map",
      label: "Map",
      active: pathname === "/map" || pathname?.startsWith("/map/"),
      icon: <MapIcon className="h-4 w-4" />,
  }

  if (!isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 z-[999] w-full h-16 bg-background border-t">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        <Link
          href={homeRoute.href}
          aria-current={homeRoute.active ? "page" : undefined}
          className={cn(
            "inline-flex flex-col items-center justify-center px-2 hover:bg-muted focus:outline-none",
            homeRoute.active ? "text-primary" : "text-muted-foreground"
          )}
        >
          {homeRoute.icon}
          <span className="text-xs">{homeRoute.label}</span>
        </Link>
        <Link
          href={discoverRoute.href}
          aria-current={discoverRoute.active ? "page" : undefined}
          className={cn(
            "inline-flex flex-col items-center justify-center px-2 hover:bg-muted focus:outline-none",
            discoverRoute.active ? "text-primary" : "text-muted-foreground"
          )}
        >
          {discoverRoute.icon}
          <span className="text-xs">{discoverRoute.label}</span>
        </Link>
        <button
          onClick={postAdRoute.onClick}
          className="inline-flex flex-col items-center justify-center px-2 hover:bg-muted text-muted-foreground"
        >
          <div className="bg-primary text-white rounded-full p-2">
            {postAdRoute.icon}
          </div>
          <span className="text-xs">{postAdRoute.label}</span>
        </button>
        <Link
          href={listingsRoute.href}
          aria-current={listingsRoute.active ? "page" : undefined}
          className={cn(
            "inline-flex flex-col items-center justify-center px-2 hover:bg-muted focus:outline-none",
            listingsRoute.active ? "text-primary" : "text-muted-foreground"
          )}
        >
          {listingsRoute.icon}
          <span className="text-xs">{listingsRoute.label}</span>
        </Link>
        <Link
            href={mapRoute.href}
            aria-current={mapRoute.active ? "page" : undefined}
            className={cn(
              "inline-flex flex-col items-center justify-center px-2 hover:bg-muted focus:outline-none",
              mapRoute.active ? "text-primary" : "text-muted-foreground"
            )}
          >
            {mapRoute.icon}
            <span className="text-xs">{mapRoute.label}</span>
          </Link>
      </div>
    </div>
  );
};

export default BottomNavBar;