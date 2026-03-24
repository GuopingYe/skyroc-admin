// frontend/src/components/Skeleton/DataSkeleton.tsx
// @unocss-include

interface DataSkeletonProps {
  rows?: number;
  className?: string;
}

export function DataSkeleton({ rows = 4, className = '' }: DataSkeletonProps) {
  return (
    <div className={`p-16px ${className}`}>
      <div className="animate-pulse flex flex-col gap-8px">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-16px bg-gray-200 dark:bg-gray-700 rounded"
            style={{ width: `${Math.random() * 50 + 25}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="p-16px">
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex gap-8px mb-8px">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-32px bg-gray-200 dark:bg-gray-700 rounded flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-8px mb-4px">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-24px bg-gray-100 dark:bg-gray-800 rounded flex-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}