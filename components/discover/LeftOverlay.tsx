"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const LeftOverlay = ({ username, tags }: { username: string, tags: string[] }) => {
    const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-24 left-4 text-white max-w-[80%]">
      <h3 className="font-bold text-lg">@{username}</h3>
      <div
        className="flex gap-2 items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={cn("flex gap-2 items-center", isExpanded ? "flex-wrap" : "nowrap overflow-hidden")}>
            {tags.map((tag, index) => (
                <span key={index} className="font-semibold">{tag}</span>
            ))}
        </div>
        {!isExpanded && tags.length > 3 && (
            <span className="font-semibold">...</span>
        )}
        {isExpanded && (
            <span className="font-semibold text-sm text-gray-300 cursor-pointer">less</span>
        )}
      </div>
    </div>
  );
};

export default LeftOverlay;
