import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export const MapLayout = ({ sidebar, children, buttonText }: {
  sidebar: React.ReactElement | ((props: { isOpen: boolean; onToggle: () => void }) => React.ReactNode);
  children: React.ReactNode;
  buttonText: string;
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {typeof sidebar === 'function'
        ? sidebar({ isOpen: isSidebarOpen, onToggle: toggleSidebar })
        : React.cloneElement(sidebar, { isOpen: isSidebarOpen, onToggle: toggleSidebar })}
      <main className={`transition-all duration-300 ease-in-out h-full ${isSidebarOpen ? 'ml-80' : 'ml-0'}`}>
        {children}
      </main>
      {!isSidebarOpen && (
         <Button
         variant="secondary"
         className="absolute top-4 left-4 z-30 flex items-center md:hidden"
         onClick={toggleSidebar}
       >
         <ChevronRight className="h-5 w-5 mr-1" />
         {buttonText}
       </Button>
      )}
    </div>
  );
};
