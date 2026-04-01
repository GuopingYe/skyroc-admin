// @unocss-include

import { useMemo } from 'react';

interface DataSkeletonProps {
  className?: string;
  rows?: number;
}

function DataSkeleton({ className = '', rows = 4 }: DataSkeletonProps) {
  // Generate stable random widths on mount to prevent visual jitter
  const widths = useMemo(() => Array.from({ length: rows }, () => Math.random() * 50 + 25), [rows]);

  return (
    <div className={`p-16px ${className}`}>
      <div className="flex flex-col animate-pulse gap-8px">
        {widths.map((width, index) => (
          <div
            className="h-16px rounded bg-gray-200 dark:bg-gray-700"
            key={index}
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function TableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="p-16px">
      <div className="animate-pulse">
        <div className="mb-8px flex gap-8px">
          {Array.from({ length: columns }).map((_, i) => (
            <div
              className="h-32px flex-1 rounded bg-gray-200 dark:bg-gray-700"
              key={i}
            />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            className="mb-4px flex gap-8px"
            key={rowIndex}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                className="h-24px flex-1 rounded bg-gray-100 dark:bg-gray-800"
                key={colIndex}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default {
  DataSkeleton,
  TableSkeleton
};
