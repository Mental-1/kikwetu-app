import React from 'react';

const ConversationSkeleton = () => {
  return (
    <div className="p-4 border-b animate-pulse">
      <div className="flex items-center">
        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 mr-4"></div>
        <div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
        </div>
      </div>
    </div>
  );
};

export const ConversationListSkeleton = () => {
  return (
    <div>
      {[...Array(5)].map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
};
