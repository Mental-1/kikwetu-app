'use client';

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";

const FooterLogo = () => {
  const { theme } = useTheme();
  const logoSrc = theme === 'dark' ? '/kikwetu-dark.png' : '/kikwetu_light.png';

  if (!theme) {
    return (
      <Image
        src="/kikwetu_light.png"
        alt="Kikwetu Logo"
        width={180}
        height={60}
        className="h-15 w-auto"
      />
    );
  }

  return (
    <Image
      src={logoSrc}
      alt="Kikwetu Logo"
      width={180}
      height={60}
      className="h-15 w-auto"
    />
  );
};

/**
 * Renders the website footer with branding, navigation links, category filters, and social media connections.
 *
 * The footer includes a site logo and description, quick navigation links, category-based listing links, external social media links, and a bottom section with copyright and policy links.
 */
export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center space-x-2">
              <FooterLogo />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Find and post classified ads in your area. Buy, sell, and connect
              with your local community.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium">Quick Links</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/listings"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Listings
                </Link>
              </li>
              <li>
                <Link
                  href="/map"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Map View
                </Link>
              </li>
              <li>
                <Link
                  href="/post-ad"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Post Ad
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium">Categories</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link
                  href="/listings?category=1"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Vehicles
                </Link>
              </li>
              <li>
                <Link
                  href="/listings?category=2"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Electronics
                </Link>
              </li>
              <li>
                <Link
                  href="/listings?category=3"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Furniture
                </Link>
              </li>
              <li>
                <Link
                  href="/listings?category=4"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Real Estate
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium">Connect With Us</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a
                  href="https://www.facebook.com/share/1Bi6ukAWP6/?mibextid=wwXIfr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/routemerouteme?s=21"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Twitter (X)
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/routeme_123?igsh=MTlpZHN6OHA5ejkyZg%3D%3D&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/routeme-routeme-402b8b263?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between border-t pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} RouteMe. All rights reserved.
          </p>
          <div className="mt-4 flex items-center space-x-4 md:mt-0">
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
