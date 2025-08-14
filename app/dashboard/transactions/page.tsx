"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { TransactionItem } from "@/lib/types/dashboard-types";

import Link from "next/link";
import { ChevronLeft, CalendarIcon, DownloadIcon } from "lucide-react";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
        });

        if (dateRange?.from) {
          params.append("startDate", dateRange.from.toISOString());
        }

        if (dateRange?.to) {
          params.append("endDate", dateRange.to.toISOString());
        }

        const response = await fetch(`/api/transactions?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }
        const data = await response.json();

        // Validate response structure
        if (!data || !Array.isArray(data.data)) {
          throw new Error("Invalid API response format");
        }
        setTransactions(data.data);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        setError("Failed to load transactions. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [page, dateRange]);

  // Reset to first page when date range changes
  useEffect(() => {
    setPage(1);
  }, [dateRange]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case "completed":
        return "px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full";
      case "pending":
        return "px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full";
      case "failed":
        return "px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full";
      default:
        return "";
    }
  };

  return (
    <div className="px-4 py-4">
      <Link
        href="/dashboard"
        className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <Card className="mx-auto px-4 py-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transactions</CardTitle>
            <div className="flex items-center space-x-2 md:space-x-4">
              <DatePickerWithRange onDateChangeAction={setDateRange} />
              {/* Export Button */}
              <Button>
                <DownloadIcon className="h-4 w-4 mr-0 md:mr-2" />
                <span className="hidden md:inline">Export</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Listing ID</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto" />
                    <p className="mt-2">Loading transactions...</p>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-red-600"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {transaction.listings && transaction.listings.length > 0 ? transaction.listings[0].id : "N/A"}
                    </TableCell>
                    <TableCell>{transaction.payment_method}</TableCell>
                    <TableCell>
                      {new Date(transaction.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={getStatusClass(transaction.status)}>
                        {transaction.status}
                      </span>
                    </TableCell>
                    <TableCell>KES {transaction.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
