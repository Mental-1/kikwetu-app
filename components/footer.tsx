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
      width={144}
      height={48}
      className="h-12 w-auto"
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
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              <FooterLogo />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Find and post classified ads in your area. Buy, sell, and connect
              with your local community.
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-base font-medium">Quick Links</h3>
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
              <h3 className="text-base font-medium">Legal</h3>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link
                    href="/about"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    About Kikwetu
                  </Link>
                </li>
                <li>
                  <Link
                    href="/careers"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    We are hiring!
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Terms and conditions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/school"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Kikwetu school
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between border-t pt-8 md:flex-row">
          <div className="flex space-x-4">
            <a
              href="https://www.facebook.com/share/1Bi6ukAWP6/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              Facebook
            </a>
            <a
              href="https://x.com/routemerouteme?s=21"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              Twitter (X)
            </a>
            <a
              href="https://www.instagram.com/routeme_123?igsh=MTlpZHN6OHA5ejkyZg%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              Instagram
            </a>
            <a
              href="https://www.linkedin.com/in/routeme-routeme-402b8b263?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              LinkedIn
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground md:mt-0">
            &copy; {new Date().getFullYear()} Kikwetu. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
