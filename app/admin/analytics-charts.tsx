"use client";

import React, { useEffect, useState } from "react";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalyticsData } from "./actions";
import { ListingCategoryData } from "./actions";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

interface ChartData {
  labels: string[];
  newUsersByDay: number[];
  newListingsByDay: number[];
  categoryCounts: Record<string, number>;
}

// Helper to generate date labels for the last 7 days
const getLast7DaysLabels = () => {
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    );
  }
  return labels;
};

export default function AnalyticsCharts() {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      const labels = getLast7DaysLabels();
      const analyticsResult = await getAnalyticsData();

      if ("error" in analyticsResult) {
        console.error("Error fetching chart data:", analyticsResult.error);
        setError("Failed to load analytics data. Please try again later.");
        setLoading(false);
        return;
      }

      const { usersData, listingsData } = analyticsResult;

      const processDataByDay = (items: Array<{ created_at: string }>) => {
        const dataByDay = Array(7).fill(0);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setUTCHours(0, 0, 0, 0); // Ensure consistent timezone

        items.forEach((item) => {
          const itemDate = new Date(item.created_at);
          if (itemDate >= sevenDaysAgo) {
            const diffDays = Math.floor(
              (new Date().getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (diffDays < 7) {
              dataByDay[6 - diffDays]++;
            }
          }
        });
        return dataByDay;
      };

      const newUsersByDay = processDataByDay(usersData.users);
      const newListingsByDay = processDataByDay(listingsData);

      const categoryCounts: Record<string, number> = listingsData.reduce(
        (acc: Record<string, number>, listing) => {
          if (listing.categories && listing.categories.length > 0) {
            listing.categories.forEach((category) => {
              const categoryName = category.name || "Uncategorized";
              acc[categoryName] = (acc[categoryName] || 0) + 1;
            });
          } else {
            acc["Uncategorized"] = (acc["Uncategorized"] || 0) + 1;
          }
          return acc;
        },
        {},
      );

      setChartData({
        labels,
        newUsersByDay,
        newListingsByDay,
        categoryCounts,
      });
      setLoading(false);
    };

    fetchAnalyticsData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent className="flex justify-center items-center h-80">
            <Skeleton className="h-64 w-64 rounded-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{error || "Could not load chart data."}</p>
      </div>
    );
  }

  const userGrowthData = {
    labels: chartData.labels,
    datasets: [
      {
        label: "New Users",
        data: chartData.newUsersByDay,
        borderColor: "hsl(var(--primary))",
        backgroundColor: "hsla(var(--primary), 0.2)",
        fill: true,
      },
    ],
  };

  const listingsGrowthData = {
    labels: chartData.labels,
    datasets: [
      {
        label: "New Listings",
        data: chartData.newListingsByDay,
        borderColor: "hsl(var(--accent))",
        backgroundColor: "hsla(var(--accent), 0.2)",
        fill: true,
      },
    ],
  };

  const categoryDistributionData = {
    labels: Object.keys(chartData.categoryCounts),
    datasets: [
      {
        label: "Listings",
        data: Object.values(chartData.categoryCounts),
        backgroundColor: [
          "hsl(var(--chart-1))",
          "hsl(var(--chart-2))",
          "hsl(var(--chart-3))",
          "hsl(var(--chart-4))",
          "hsl(var(--chart-5))",
          "hsl(var(--chart-6))",
        ],
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      <Card>
        <CardHeader>
          <CardTitle>User Growth (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <Line data={userGrowthData} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>New Listings (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <Line data={listingsGrowthData} />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Listing Distribution by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-80">
          <Doughnut
            data={categoryDistributionData}
            options={{ maintainAspectRatio: false }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
