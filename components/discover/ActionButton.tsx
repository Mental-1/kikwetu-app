"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  activeColor?: string;
}

const ActionButton = ({ icon, label, onClick, activeColor }: ActionButtonProps) => {
  const [isActive, setIsActive] = useState(false);

  const handleClick = () => {
    setIsActive(!isActive);
    if (onClick) {
      onClick();
    }
  };

  return (
    <button onClick={handleClick} className="flex flex-col items-center gap-1 text-white">
      <div className={cn("rounded-full p-3 transition-colors", isActive ? activeColor : "bg-gray-800 bg-opacity-50")}>
        {icon}
      </div>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
};

export default ActionButton;
