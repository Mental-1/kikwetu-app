import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import React from "react";
import { Listing } from "@/lib/types/listing";
import { approveListing, rejectListing } from "./actions";
import ListingActions from "@/components/admin/listing-actions";

async function getAllListings(): Promise<Listing[]> {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing required environment variables");
    return [];
  }

  const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
    },
  });

  const { data, error } = await supabase
    .from("listings")
    .select("*, profiles!inner(*)");

  if (error) {
    console.error("Error fetching listings:", error);
    return [];
  }

  return data as Listing[];
}



export default async function ListingsPage() {
  const listings = await getAllListings();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Listing Moderation</h1>
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Title
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Author
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id}>
                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                  <p className="text-gray-900 dark:text-white whitespace-no-wrap">
                    {listing.title}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                  <p className="text-gray-900 dark:text-white whitespace-no-wrap">
                    {listing.profiles.email}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                  <span
                    className={`capitalize px-2.5 py-0.5 rounded text-xs font-semibold ${listing.status === "approved" ? "bg-green-100 text-green-800" : listing.status === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}
                  >
                    {listing.status || "pending"}
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-right">
                  <div className="flex gap-2 justify-end">
                    <ListingActions listing={listing} />
                    <a
                      href={`/admin/listings/${listing.id}`}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded inline-flex items-center"
                    >
                      View
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
