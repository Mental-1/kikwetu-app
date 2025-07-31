"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/listings?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      <form className="relative" onSubmit={handleSearch}>
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search for items, services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 pr-4 py-6 text-base bg-white text-gray-900 border-0 h-12"
        />
        <Button size="sm" className="absolute right-2 top-1/2 -translate-y-1/2">
          Search
        </Button>
      </form>
    </div>
  );
}
