"use client";

import React, { useTransition } from "react";
import { banUser, unbanUser, getAllUsers } from "./actions";
import { User } from "@/lib/types/profile";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const UserActions = ({ user }: { user: User }) => {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const isBanned =
    user.banned_until && new Date(user.banned_until) > new Date();

  const handleSubmit = async () => {
    startTransition(async () => {
      if (isBanned) {
        await unbanUser(user.id);
      } else {
        await banUser(user.id);
      }
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] }); // Invalidate to refetch
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <button
        type="submit"
        className={`font-bold py-2 px-4 rounded ${isBanned ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
        disabled={isPending}
      >
        {isPending
          ? isBanned
            ? "Unbanning..."
            : "Banning..."
          : isBanned
            ? "Unban"
            : "Ban"}
      </button>
    </form>
  );
};

export default function UserTable() {
  const { data: users, isLoading, isError, error } = useQuery<User[]>({ 
    queryKey: ["adminUsers"],
    queryFn: getAllUsers,
  });

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (isError) {
    return <div className="text-red-500">Error: {error?.message || "Failed to load users"}</div>;
  }

  return (
    <div className="mx-auto max-w-screen-lg px-4">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user.id}>
                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                  <p className="text-gray-900 dark:text-white whitespace-no-wrap">
                    {user.email}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                  <p className="text-gray-900 dark:text-white whitespace-no-wrap">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                  <div className="flex items-center">
                    <span
                      className={`capitalize px-2.5 py-0.5 rounded text-xs font-semibold ${user.banned_until && new Date(user.banned_until) > new Date() ? "bg-red-100 text-red-800" : "bg-green-700 text-white"}`}>
                        {user.banned_until &&
                        new Date(user.banned_until) > new Date()
                          ? "Banned"
                          : "Active"}
                    </span>
                    {user.profile?.is_flagged && (
                      <span className="ml-2 px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">
                        Flagged
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                  <UserActions user={user} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
