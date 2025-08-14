"use client";

import React, { useEffect, useState } from "react";
import { Line, Doughnut, Bar } from "react-chartjs-2";
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
  BarElement,
  TimeScale,
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
  BarElement,
  TimeScale,
);

interface ChartData {
  labels: string[];
  newUsersByDay: number[];
  newListingsByDay: number[];
  categoryCounts: Record<string, number>;
  tierCounts: Record<string, number>;
}

// Helper to generate date labels for the last 7 days
const getLast7DaysLabels = () => {
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toISOString().split('T')[0]); // YYYY-MM-DD format
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

      const formattedNewUsersByDay = labels.map((label, index) => ({
        x: label,
        y: newUsersByDay[index],
      }));
      const formattedNewListingsByDay = labels.map((label, index) => ({
        x: label,
        y: newListingsByDay[index],
      }));

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

      const tierCounts: Record<string, number> = listingsData.reduce(
        (acc: Record<string, number>, listing) => {
          const tierName = listing.plan_name || "Unknown";
          acc[tierName] = (acc[tierName] || 0) + 1;
          return acc;
        },
        {},
      );

      setChartData({
        labels,
        newUsersByDay: formattedNewUsersByDay,
        newListingsByDay: formattedNewListingsByDay,
        categoryCounts,
        tierCounts,
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
    datasets: [
      {
        label: "New Users",
        data: chartData.newUsersByDay,
        borderColor: "hsl(var(--chart-green))",
        backgroundColor: "hsla(var(--background), 0.2)",
        fill: true,
      },
    ],
  };

  const listingsGrowthData = {
    datasets: [
      {
        label: "New Listings",
        data: chartData.newListingsByDay,
        borderColor: "hsl(var(--chart-blue))",
        backgroundColor: "hsla(var(--background), 0.2)",
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
          "#FF4081",
          "#00B0FF",
          "#FFC107",
          "#00BCD4",
          "#7C4DFF",
          "#FF9800",
        ],
        borderColor: "hsl(var(--border))",
        borderWidth: 1,
      },
    ],
  };

  const tierDistributionData = {
    labels: Object.keys(chartData.tierCounts),
    datasets: [
      {
        label: "Listings",
        data: Object.values(chartData.tierCounts),
        backgroundColor: [
          "#FF4081",
          "#00B0FF",
          "#FFC107",
          "#00BCD4",
          "#7C4DFF",
          "#FF9800",
        ],
        borderColor: "hsl(var(--border))",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    elements: {
      bar: {
        borderWidth: 2,
      },
    },
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: "hsl(var(--foreground))",
        },
      },
      title: {
        display: true,
        text: 'Chart.js Horizontal Bar Chart',
        color: "hsl(var(--foreground))",
      },
    },
    scales: {
      x: {
        ticks: {
          color: "hsl(var(--foreground))",
        },
      },
      y: {
        ticks: {
          color: "hsl(var(--foreground))",
        },
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const, // Changed to top for line charts
        labels: {
          color: "hsl(var(--foreground))",
        },
      },
      title: {
        display: true,
        text: 'Chart.js Line Chart', // Updated title
        color: "hsl(var(--foreground))",
      },
    },
    scales: {
      x: {
        type: 'timeseries', // Change to 'timeseries'
        time: {
          unit: 'day', // Specify the unit
          tooltipFormat: 'MMM D', // Format for tooltips
        },
        ticks: {
          color: "hsl(var(--foreground))",
        },
      },
      y: {
        beginAtZero: true, // Start y-axis at zero
        ticks: {
          color: "hsl(var(--foreground))",
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>User Growth (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <Line data={userGrowthData} options={lineChartOptions} />
        </CardContent>
      </Card>
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>New Listings (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <Line data={listingsGrowthData} options={lineChartOptions} />
        </CardContent>
      </Card>
      <Card className="lg:col-span-1 rounded-xl">
        <CardHeader>
          <CardTitle>Listing Distribution by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-96">
          <Bar
            data={categoryDistributionData}
            options={options}
          />
        </CardContent>
      </Card>
      <Card className="lg:col-span-1 rounded-xl">
        <CardHeader>
          <CardTitle>Listing Distribution by Tier</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-96">
          <Bar
            data={tierDistributionData}
            options={options}
          />
        </CardContent>
      </Card>
    </div>
  );
}
