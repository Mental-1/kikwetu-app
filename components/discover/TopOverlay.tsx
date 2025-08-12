"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const TopOverlay = () => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    const handleSearch = () => {
        if (searchQuery.trim() !== "") {
            router.push(`/discover?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

  return (
    <div className="absolute top-4 left-4 z-30">
        <div className={cn("flex items-center gap-2 transition-all duration-300", isSearchOpen ? "w-64" : "w-12")}>
            <Button size="icon" variant="ghost" className="text-white" onClick={() => setIsSearchOpen(!isSearchOpen)}>
                <Search className="w-6 h-6" />
            </Button>
            <Input
                type="search"
                placeholder="Search..."
                className={cn("bg-transparent text-white placeholder:text-gray-300 border-b-2 border-white focus:outline-none", isSearchOpen ? "block" : "hidden")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
            />
        </div>
    </div>
  );
};

export default TopOverlay;
