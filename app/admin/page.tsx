import React from "react";
import AdminChartsWrapper from "./admin-charts-wrapper";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Platform Perfomance</h1>
      <AdminChartsWrapper />
    </div>
  );
}
