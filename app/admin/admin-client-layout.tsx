"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Shield,
  List,
  DollarSign,
  ChevronLeft,
  Gift
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { User } from "@supabase/supabase-js";

const navItems = [
  { href: "/admin", label: "Site Growth", icon: LayoutDashboard },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/roles", label: "Role Management", icon: Shield },
  { href: "/admin/listings", label: "Listing Moderation", icon: List },
  { href: "/admin/revenue", label: "Revenue", icon: DollarSign },
  { href: "/admin/referrals", label: "Referrals", icon: Gift },
];

export default function AdminClientLayout({ children, user }: { children: React.ReactNode, user: User | null }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { setUser } = useAuthStore();

  useEffect(() => {
    if (user?.id !== useAuthStore.getState().user?.id) {
      setUser(user);
    }
  }, [user, setUser]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <aside className={`transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 bg-white dark:bg-gray-800 shadow-lg`}>
        <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between">
          <Link href="/admin">
            <h2 className={`text-2xl font-bold text-gray-800 dark:text-white hover:text-blue-600 transition-colors ${isCollapsed ? 'hidden' : 'block'}`}>
              Admin
            </h2>
          </Link>
          <button
            type="button"
            aria-label="Toggle sidebar"
            aria-expanded={!isCollapsed}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ChevronLeft className={`h-6 w-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <nav className="mt-4">
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center px-5 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-semibold"
                >
                  <item.icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
                  <span className={isCollapsed ? 'hidden' : 'block'}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
