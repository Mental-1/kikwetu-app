// "use client";
// import Link from "next/link";
// import { Menu, Moon, Sun, Monitor, Bell } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
//   DropdownMenuSeparator,
// } from "@/components/ui/dropdown-menu";
// import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
// import { useTheme } from "next-themes";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { usePathname } from "next/navigation";
// import { useEffect, useState } from "react";
// import { createBrowserClient } from "@/utils/supabase/supabase-browser";
// import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
// import { toast } from "@/hooks/use-toast";
// import { validators } from "tailwind-merge";
// import { ThemeToggle } from "@/components/theme-toggle";

// /**
//  * Renders a responsive navigation header with authentication, notification, and theme toggling features.
//  *
//  * Displays navigation links, a theme toggle button, notification dropdown, and user menu. Adapts layout for desktop and mobile screens. Shows user-specific options and notification count when authenticated, and provides login access otherwise.
//  */
// export function Header() {
//   const { theme, setTheme } = useTheme();
//   const pathname = usePathname();
//   const [user, setUser] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [mounted, setMounted] = useState(false);
//   const [unreadCount, setUnreadCount] = useState(0);
//   const supabase = createBrowserClient();

//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   useEffect(() => {
//     async function getUser() {
//       try {
//         const {
//           data: { session },
//         } = await supabase.auth.getSession();
//         setUser(session?.user || null);
//         setLoading(false);

//         if (session?.user) {
//           // Get unread notification count
//           const { count } = await supabase
//             .from("notifications")
//             .select("*", { count: "exact", head: true })
//             .eq("user_id", session.user.id)
//             .eq("read", false);

//           setUnreadCount(count || 0);
//         }
//       } catch (error) {
//         console.error("Error getting user session:", error);
//         setLoading(false);
//       }
//     }

//     getUser();

//     const { data: authListener } = supabase.auth.onAuthStateChange(
//       (event, session) => {
//         setUser(session?.user || null);
//         if (event === "SIGNED_OUT") {
//           setUnreadCount(0);
//         }
//       },
//     );

//     return () => {
//       authListener.subscription.unsubscribe();
//     };
//   }, [supabase]);

//   const handleSignOut = async () => {
//     try {
//       await supabase.auth.signOut();
//     } catch (error) {
//       console.error("Error signing out:", error);
//     }
//   };

//   // Determine if we're on the map page to apply special z-index
//   const isMapPage = pathname === "/map";

//   if (!mounted) {
//     return null; // Avoid hydration mismatch
//   }

//   return (
//     <header
//       className={`sticky top-0 ${isMapPage ? "z-50" : "z-40"} w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`}
//     >
//       <div className="container flex h-14 items-center justify-between px-4">
//         {/* Logo */}
//         <Link href="/" className="flex items-center space-x-2">
//           <img
//             src="/images/routeme-logo-new.png"
//             alt="RouteMe Logo"
//             className="h-8 w-auto"
//           />
//         </Link>

//         {/* Desktop Navigation */}
//         <nav className="hidden md:flex items-center space-x-4">
//           <Link
//             href="/listings"
//             className="text-sm font-medium hover:text-primary transition-colors"
//           >
//             Browse
//           </Link>
//           <Link
//             href="/map"
//             className="text-sm font-medium hover:text-primary transition-colors"
//           >
//             Map View
//           </Link>
//           <Button asChild>
//             <Link href="/post-ad">Post Ad</Link>
//           </Button>

//           {/* Theme Toggle */}
//           <ThemeToggle
//             className={`${
//               isMapPage ? "z-[1001]" : ""
//             } h-8 w-8 rounded-full bg-transparent hover:bg-muted/50 transition-colors`}
//           />
//           {/* Notifications */}
//           {user ? (
//             <NotificationDropdown
//               unreadCount={unreadCount}
//               setUnreadCountAction={setUnreadCount}
//             />
//           ) : (
//             <Button
//               variant="ghost"
//               size="icon"
//               className={isMapPage ? "z-[1001]" : ""}
//             >
//               <Bell className="h-4 w-4" />
//             </Button>
//           )}

//           {/* User Menu */}
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className={`rounded-full ${isMapPage ? "z-[1001]" : ""}`}
//               >
//                 <Avatar className="h-8 w-8">
//                   <AvatarImage
//                     src={
//                       user?.user_metadata?.avatar_url ||
//                       "/placeholder.svg?height=32&width=32"
//                     }
//                     alt="User"
//                   />
//                   <AvatarFallback>
//                     {user?.email?.charAt(0).toUpperCase() || "U"}
//                   </AvatarFallback>
//                 </Avatar>
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent
//               align="end"
//               className={`w-56 ${isMapPage ? "z-[1001]" : ""}`}
//             >
//               {user ? (
//                 <>
//                   <DropdownMenuItem asChild>
//                     <Link href="/account">Account</Link>
//                   </DropdownMenuItem>
//                   <DropdownMenuItem asChild>
//                     <Link href="/dashboard">Dashboard</Link>
//                   </DropdownMenuItem>
//                   <DropdownMenuItem asChild>
//                     <Link href="/settings">Settings</Link>
//                   </DropdownMenuItem>
//                   <DropdownMenuSeparator />
//                   <DropdownMenuItem onClick={handleSignOut}>
//                     Sign Out
//                   </DropdownMenuItem>
//                 </>
//               ) : (
//                 <>
//                   <DropdownMenuItem asChild>
//                     <Link href="/auth?tab=sign-in">Login</Link>
//                   </DropdownMenuItem>
//                 </>
//               )}
//             </DropdownMenuContent>
//           </DropdownMenu>
//         </nav>

//         {/* Mobile Menu */}
//         <div className="flex md:hidden items-center space-x-2">
//           <Sheet>
//             <SheetTrigger asChild>
//               <Button variant="ghost" size="icon">
//                 <Menu className="h-4 w-4" />
//               </Button>
//             </SheetTrigger>
//             <SheetContent side="right" className="w-80">
//               <div className="flex flex-col space-y-4 mt-8">
//                 <Link href="/listings" className="text-lg font-medium">
//                   Browse Listings
//                 </Link>
//                 <Link href="/map" className="text-lg font-medium">
//                   Map View
//                 </Link>
//                 <Link href="/post-ad" className="text-lg font-medium">
//                   Post Ad
//                 </Link>
//                 {user ? (
//                   <>
//                     <Link href="/account" className="text-lg font-medium">
//                       Account
//                     </Link>
//                     <Link href="/dashboard" className="text-lg font-medium">
//                       Dashboard
//                     </Link>
//                     <Link href="/settings" className="text-lg font-medium">
//                       Settings
//                     </Link>
//                     <Button variant="outline" onClick={handleSignOut}>
//                       Sign Out
//                     </Button>
//                   </>
//                 ) : (
//                   <>
//                     <Link
//                       href="/auth?tab=sign-in"
//                       className="text-lg font-medium"
//                     >
//                       Login
//                     </Link>
//                   </>
//                 )}
//               </div>
//             </SheetContent>
//           </Sheet>
//         </div>
//       </div>
//     </header>
//   );
// }
