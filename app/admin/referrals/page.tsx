"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CreateDiscountCodeForm } from "@/components/admin/create-discount-code-form";
import { toast } from "@/components/ui/use-toast";

interface DiscountCode {
  id: number;
  code: string;
  type: "PERCENTAGE_DISCOUNT" | "FIXED_AMOUNT_DISCOUNT" | "EXTRA_LISTING_DAYS";
  value: number;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_by_user_id: string | null;
  created_at: string;
}

export default function AdminReferralsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [discountCodeToDeleteId, setDiscountCodeToDeleteId] = useState<number | null>(null);

  const handleDialogChange = React.useCallback((open: boolean) => {
    setIsFormOpen(open);
    if (!open) setEditingCode(null);
  }, [setIsFormOpen, setEditingCode]);

  const { data, isLoading, error } = useQuery<DiscountCode[]>({
    queryKey: ["adminDiscountCodes"],
    queryFn: async () => {
      const response = await fetch("/api/admin/discount-codes");
      if (!response.ok) {
        throw new Error("Failed to fetch discount codes");
      }
      return response.json();
    },
  });

  const queryClient = useQueryClient();

  const deleteDiscountCodeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch("/api/admin/discount-codes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete discount code");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Discount code deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["adminDiscountCodes"] });
    },
    onError: (error: unknown) => {
      let message = "Failed to delete discount code.";
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === "string") {
        message = error;
      } else {
        try {
          message = JSON.stringify(error);
        } catch (e) {
          // Fallback to default message
        }
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    setDiscountCodeToDeleteId(id);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (discountCodeToDeleteId !== null) {
      deleteDiscountCodeMutation.mutate(discountCodeToDeleteId);
      setIsConfirmDialogOpen(false);
      setDiscountCodeToDeleteId(null);
    }
  };

  const handleEdit = (code: DiscountCode) => {
    setEditingCode(code);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Referral & Discount Code Management</h1>
        <p>Loading discount codes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Referral & Discount Code Management</h1>
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Referral & Discount Code Management</h1>
      <Card className="rounded-lg"> {/* Added rounded-lg */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">All Discount Codes</CardTitle>
          <Button 
            onClick={() => { setEditingCode(null); setIsFormOpen(true); }}
            className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
          >
            Create New Code
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Expires At</TableHead>
                <TableHead>Max Uses</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-medium">{code.code}</TableCell>
                  <TableCell>{code.type}</TableCell>
                  <TableCell>{code.value}</TableCell>
                  <TableCell>
                    {code.expires_at ? format(new Date(code.expires_at), "PPP") : "Never"}
                  </TableCell>
                  <TableCell>{code.max_uses ?? "Unlimited"}</TableCell>
                  <TableCell>{code.use_count}</TableCell>
                  <TableCell>{code.is_active ? "Yes" : "No"}</TableCell>
                  <TableCell>{code.created_by_user_id ?? "N/A"}</TableCell>
                  <TableCell className="flex flex-col sm:flex-row gap-2 sm:gap-0"> {/* Added flex-col and gap */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-0 sm:mr-2 mb-2 sm:mb-0 rounded-lg"
                      onClick={() => handleEdit(code)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => handleDelete(code.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-[600px] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-center">
              {editingCode ? "Edit Discount Code" : "Create New Discount Code"}
            </DialogTitle>
            <DialogDescription>
              {editingCode ? "Edit the details of this discount code." : "Fill in the details to create a new discount or referral code."}
            </DialogDescription>
          </DialogHeader>
          <CreateDiscountCodeForm
            initialData={editingCode}
            onSuccess={() => { setIsFormOpen(false); setEditingCode(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-lg">
          <DialogHeader className="text-center">
            <DialogTitle className="text-center">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to delete this discount code? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              className="rounded-lg w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="rounded-lg w-full sm:w-auto"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}