'use client';

import { ListingsClient } from './listings-client';

export default function ListingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-6">
        <ListingsClient />
      </div>
    </div>
  );
}
