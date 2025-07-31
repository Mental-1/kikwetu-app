"use client";

import React, { useEffect, useRef, useState } from "react";
import { updateUserRole } from "./actions";
import { useToast } from "@/hooks/use-toast";
import type { User } from "./page";
import { useRouter } from "next/navigation";

const RoleManagementForm = ({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) => {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newRole = formData.get("role") as string;

    if (newRole === currentRole) {
      toast({
        title: "No Change",
        description: "The selected role is the same as the current role.",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await updateUserRole(formData);

    if (result.success) {
      toast({
        title: "Success",
        description: result.success,
      });
      formRef.current?.reset();
      router.refresh();
    } else if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-2 py-1"
        aria-label={`Change role for user ${userId}`}
        disabled={isSubmitting}
      >
        <option value="user">User</option>
        <option value="admin">Admin</option>
        <option value="moderator">Moderator</option>
      </select>
      <button
        type="submit"
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Updating..." : "Update"}
      </button>
    </form>
  );
};

export const RoleManagementView = ({ users }: { users: User[] }) => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">User Role Management</h1>
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Current Role
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                  <p className="text-gray-900 dark:text-white whitespace-no-wrap">
                    {user.email}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                  <span className="capitalize bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                  <RoleManagementForm
                    userId={user.id}
                    currentRole={user.role}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};