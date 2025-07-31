"use client";

import dynamic from "next/dynamic";

const AnalyticsCharts = dynamic(() => import("./analytics-charts"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-3 text-muted-foreground">Loading charts...</span>
    </div>
  ),
});

export default function AdminChartsWrapper() {
  return <AnalyticsCharts />;
}
