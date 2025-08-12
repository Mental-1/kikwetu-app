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
      active: pathname === "/discover",
      icon: <Compass className="h-4 w-4" />,
    },
    {
      href: "/listings",
      label: "Listings",
      active: pathname === "/listings",
      icon: <List className="h-4 w-4" />,
    },
  ];

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

  const mapRoute = {
      href: "/map",
      label: "Map",
      active: pathname === "/map",
      icon: <MapIcon className="h-4 w-4" />,
  }

  if (!isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 z-[999] w-full h-16 bg-background border-t">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "inline-flex flex-col items-center justify-center px-2 hover:bg-muted",
              route.active ? "text-primary" : "text-muted-foreground"
            )}
          >
            {route.icon}
            <span className="text-xs">{route.label}</span>
          </Link>
        ))}
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
            key={mapRoute.href}
            href={mapRoute.href}
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