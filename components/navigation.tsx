"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image"; // Import Image component
import { useTheme } from "next-themes"; // Import useTheme
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  Settings,
  Plus,
  Home,
  List,
  Map as MapIcon,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

const Logo = () => {
  const { theme } = useTheme();
  const logoSrc = theme === 'dark' ? '/kikwetu-dark.png' : '/kikwetu_light.png';

  // Handle SSR case where theme might be undefined
  if (!theme) {
    return (
      <Image
        src="/kikwetu_light.png"
        alt="Kikwetu Logo"
        width={144}
        height={48}
        className="h-12 w-auto"
      />
    );
  }

  return (
    <Image
      src={logoSrc}
      alt="Kikwetu Logo"
      width={120}
      height={40}
      className="h-10 w-auto"
    />
  );
};

/**
 * Displays a responsive navigation bar with search, theme toggle, and user-specific actions for both mobile and desktop devices.
 *
 * The navigation adapts its layout based on device size, showing a collapsible menu and togglable search input on mobile. Authenticated users have access to a dropdown menu with profile information and account actions, while unauthenticated users are prompted to log in.
 *
 * @returns The application's navigation bar component.
 */
export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user, profile, signOut } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const routes = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/",
    },
    {
      href: "/listings",
      label: "Listings",
      active: pathname === "/listings",
    },
    {
      href: "/map",
      label: "Map View",
      active: pathname === "/map",
    },
  ];

  const mobileRoutes = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/",
      icon: <Home className="mr-2 h-4 w-4" />,
    },
    {
      href: "/listings",
      label: "Listings",
      active: pathname === "/listings",
      icon: <List className="mr-2 h-4 w-4" />,
    },
    {
      href: "/map",
      label: "Map View",
      active: pathname === "/map",
      icon: <MapIcon className="mr-2 h-4 w-4" />,
    },
    ...(user ? [
      {
        href: "/account",
        label: "Account",
        active: pathname === "/account",
        icon: <User className="mr-2 h-4 w-4" />,
      },
      {
        href: "/dashboard",
        label: "Dashboard",
        active: pathname === "/dashboard",
        icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      },
      {
        href: "/post-ad",
        label: "Post Ad",
        active: pathname === "/post-ad",
        icon: <Plus className="mr-2 h-4 w-4" />,
      },
    ] : []),
  ];

  

  const UserMenu = () => {
    if (!user) {
      return (
        <Button variant="default" onClick={() => router.push("/auth")}>
          Login
        </Button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={profile?.avatar_url || ""}
                alt={profile?.full_name || ""}
              />
              <AvatarFallback>
                {profile?.full_name?.substring(0, 2).toUpperCase() ||
                  user.email?.substring(0, 2).toUpperCase() ||
                  "U"}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 z-[1002]" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {profile?.full_name || "User"}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/account")}>
            <User className="mr-2 h-4 w-4" />
            <span>Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              try {
                await signOut();
              } catch (error) {
                console.error("Sign out failed:", error);
              }
            }}
          >
            {" "}
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const DesktopNav = () => (
    <div className="container flex h-16 items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center space-x-2">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                route.active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {route.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="hidden md:flex items-center gap-4">
        <ThemeToggle />
        {user ? (
          <Button variant="default" onClick={() => router.push("/post-ad")}>
            Post Ad
          </Button>
        ) : null}
        <UserMenu />
      </div>
      <div className="flex md:hidden items-center gap-4">
        <ThemeToggle />
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="z-[1002] flex flex-col">
            <div className="flex flex-col gap-6 py-4">
              <Link href="/" className="flex items-center space-x-2">
                <Logo />
              </Link>
              <Separator />
              <nav className="flex flex-col gap-4">
                {mobileRoutes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => setIsSheetOpen(false)} // Close sheet on link click
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary flex items-center py-2",
                      route.active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {route.icon}
                    {route.label}
                  </Link>
                ))}
              </nav>
            </div>
            {user ? (
              <div className="mt-auto flex flex-col gap-4 p-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    try {
                      await signOut();
                      setIsSheetOpen(false);
                    } catch (error) {
                      console.error("Sign out failed:", error);
                    }
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="mt-auto p-4">
                <Button
                  className="w-full"
                  onClick={() => {
                    router.push("/auth");
                    setIsSheetOpen(false);
                  }}
                >
                  Sign In
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );

  return (
    // The z-index value of 1001 is intentionally set above 1000 to reserve this range for top-level chrome elements.
    <header className="sticky top-0 z-[1001] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <DesktopNav />
    </header>
  );
}
