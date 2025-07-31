import React from "react";
import Link from "next/link";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "User Management" },
  { href: "/admin/roles", label: "Role Management" },
  { href: "/admin/listings", label: "Listing Moderation" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 shadow-lg">
        <div className="p-5 border-b dark:border-gray-700">
          <Link href="/admin">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white hover:text-blue-600 transition-colors">
              Admin Panel
            </h2>
          </Link>
        </div>
        <nav className="mt-4">
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-5 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {item.label}
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
