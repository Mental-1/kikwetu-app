'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/navigation';
import { Footer } from '@/components/footer';
import BottomNavBar from '@/components/bottom-nav';
import { Toaster } from '@/components/ui/toaster';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDiscoverRoute = pathname.startsWith('/discover');

  return (
    <>
      <div className="flex min-h-screen flex-col">
        {!isDiscoverRoute && <Navigation />}
        <main className="flex-1">{children}</main>
        {!isDiscoverRoute && <Footer />}
      </div>
      <Toaster />
      <BottomNavBar />
    </>
  );
}
