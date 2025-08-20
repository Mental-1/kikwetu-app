"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";

const formSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(50, "Code must be at most 50 characters").regex(/^[a-zA-Z0-9_]+$/, "Code can only contain letters, numbers, and underscores"),
  type: z.enum(["PERCENTAGE_DISCOUNT", "FIXED_AMOUNT_DISCOUNT", "EXTRA_LISTING_DAYS"]),
  value: z.union([z.string(), z.number()]).pipe(z.coerce.number().min(0, "Value must be non-negative")),
  expires_at: z.date().nullable().optional(),
  max_uses: z.coerce.number().int().min(0, "Max uses must be non-negative").nullable().optional(),
  is_active: z.boolean().default(true),
  created_by_user_id: z.string().uuid("Invalid user ID").nullable().optional(),
});

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

interface CreateDiscountCodeFormProps {
  onSuccess: () => void;
  initialData?: DiscountCode | null;
}

interface UserSearchResult {
  id: string;
  username: string | null;
  email: string | null;
  full_name: string | null;
}

export function CreateDiscountCodeForm({ onSuccess, initialData }: CreateDiscountCodeFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      type: "PERCENTAGE_DISCOUNT",
      value: 0 as number,
      expires_at: null,
      max_uses: null,
      is_active: true,
      created_by_user_id: null,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        expires_at: initialData.expires_at ? new Date(initialData.expires_at) : null,
        value: initialData.value,
        max_uses: initialData.max_uses ?? null,
      });
      if (initialData.created_by_user_id) {
        setSelectedUser({ id: initialData.created_by_user_id, username: "Loading...", email: "Loading...", full_name: "Loading..." });
      }
    } else {
      form.reset();
    }
  }, [initialData, form]);

  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);

  const debouncedUserSearch = debounce((term: string) => {
    setUserSearchTerm(term);
  }, 300);

  const { data: userSearchResults } = useQuery<UserSearchResult[]>(
    {
      queryKey: ["adminUserSearch", userSearchTerm],
      queryFn: async () => {
        if (!userSearchTerm) return [];
        const response = await fetch(`/api/admin/users/search?query=${userSearchTerm}`);
        if (!response.ok) {
          throw new Error("Failed to search users");
        }
        return response.json();
      },
      enabled: !!userSearchTerm,
    }
  );

  useEffect(() => {
    if (selectedUser) {
      form.setValue("created_by_user_id", selectedUser.id);
    } else {
      form.setValue("created_by_user_id", null);
    }
  }, [selectedUser, form]);

  const createDiscountCodeMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await fetch("/api/admin/discount-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          expires_at: values.expires_at ? values.expires_at.toISOString() : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create discount code");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Discount code created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["adminDiscountCodes"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create discount code.",
        variant: "destructive",
      });
    },
  });

  const updateDiscountCodeMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!initialData?.id) {
        throw new Error("Cannot update code without an ID.");
      }
      const response = await fetch("/api/admin/discount-codes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: initialData.id,
          ...values,
          expires_at: values.expires_at ? values.expires_at.toISOString() : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update discount code");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Discount code updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["adminDiscountCodes"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update discount code.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (initialData) {
      updateDiscountCodeMutation.mutate(values);
    } else {
      createDiscountCodeMutation.mutate(values);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g., WELCOME15" {...field} disabled={!!initialData} className="rounded-lg" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Select a discount type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PERCENTAGE_DISCOUNT">Percentage Discount</SelectItem>
                  <SelectItem value="FIXED_AMOUNT_DISCOUNT">Fixed Amount Discount</SelectItem>
                  <SelectItem value="EXTRA_LISTING_DAYS">Extra Listing Days</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 15 (for 15% or 15 days)" {...field} className="rounded-lg" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expires_at"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Expires At (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal rounded-lg",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="max_uses"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Uses (Optional)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 100 (leave blank for unlimited)" {...field} className="rounded-lg" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Is Active</FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {/* User Search Input */}
        <FormItem>
          <FormLabel>Link to User (Optional)</FormLabel>
          <FormControl>
            <Input
              placeholder="Search by username or email"
              value={userSearchTerm}
              onChange={(e) => {
                setUserSearchTerm(e.target.value);
                setSelectedUser(null);
                debouncedUserSearch(e.target.value);
              }}
              className="rounded-lg"
            />
          </FormControl>
          <FormMessage />
          {userSearchTerm && !selectedUser && userSearchResults && userSearchResults.length > 0 && (
            <div className="border rounded-lg mt-2 max-h-40 overflow-y-auto">
              {userSearchResults.map((user) => (
                <div
                  key={user.id}
                  className="p-2 cursor-pointer hover:bg-gray-100 rounded-lg"
                  onClick={() => {
                    setSelectedUser(user);
                    setUserSearchTerm(user.username || user.email || user.id);
                  }}
                >
                  {user.username} ({user.email})
                </div>
              ))}
            </div>
          )}
          {selectedUser && (
            <p className="text-sm text-muted-foreground mt-2">
              Selected User: {selectedUser.username || selectedUser.email} (ID: {selectedUser.id})
              <Button variant="link" size="sm" onClick={() => {
                setSelectedUser(null);
                setUserSearchTerm("");
              }}>Clear</Button>
            </p>
          )}
          {userSearchTerm && !selectedUser && userSearchResults && userSearchResults.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">No users found.</p>
          )}
        </FormItem>

        <Button type="submit" className="w-full sm:w-auto mb-4 sm:mb-0 rounded-lg"
          disabled={createDiscountCodeMutation.isPending || updateDiscountCodeMutation.isPending}>
          {initialData ? (updateDiscountCodeMutation.isPending ? "Updating..." : "Update Code") : (createDiscountCodeMutation.isPending ? "Creating..." : "Create Code")}
        </Button>
      </form>
    </Form>
  );
}
