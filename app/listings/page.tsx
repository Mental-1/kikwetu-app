'use client';

import React, { Suspense } from 'react';
import { ListingsPageSkeleton } from '@/components/skeletons/listings-page-skeleton'; // Import the skeleton

const ListingsClient = React.lazy(() => import('./listings-client').then(mod => ({ default: mod.ListingsClient })));

export default function ListingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-6">
        <Suspense fallback={<ListingsPageSkeleton />}> {/* Use the actual skeleton */}
          <ListingsClient />
        </Suspense>
      </div>
    </div>
  );
}
