import React from 'react';

export const ChatSkeleton = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center animate-pulse">
        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 mr-4"></div>
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900 animate-pulse">
        <div className="flex mb-4 justify-start">
          <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 w-48 h-12"></div>
        </div>
        <div className="flex mb-4 justify-end">
          <div className="p-3 rounded-lg bg-blue-200 dark:bg-blue-900 w-48 h-12"></div>
        </div>
        <div className="flex mb-4 justify-start">
          <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 w-32 h-8"></div>
        </div>
      </div>
      <div className="p-4 border-t bg-white dark:bg-black animate-pulse">
        <div className="w-full p-2 border rounded-lg bg-gray-200 dark:bg-gray-800 h-10"></div>
      </div>
    </div>
  );
};
