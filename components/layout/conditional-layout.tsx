'use client';

import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import Navigation from '@/components/navigation';
import { Footer } from '@/components/footer';
import BottomNavBar from '@/components/bottom-nav';
import { Toaster } from '@/components/ui/toaster';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const hideChrome = pathname.startsWith('/discover') && isMobile;

  return (
    <>
      <div className="flex min-h-screen flex-col">
        {!hideChrome && <Navigation />}
        <main className="flex-1">{children}</main>
        {!hideChrome && <Footer />}
      </div>
      <Toaster />
      <BottomNavBar />
    </>
  );
}