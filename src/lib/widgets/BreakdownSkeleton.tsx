import React from 'react';
import { Skeleton } from './Skeleton';

export const BreakdownSkeleton: React.FC = () => {
  return (
    <div className="w-full flex flex-col gap-6 pb-8 animate-pulse">
      {/* Hero Section Skeleton */}
      <div className="bg-white border-[3px] border-b-[6px] border-[#E5E5E5] rounded-[24px] p-6 flex flex-row items-center justify-between gap-4">
        <div className="flex flex-col flex-1 z-10 w-full">
          <Skeleton className="w-16 h-6 mb-3 rounded-[10px]" />
          <Skeleton className="w-24 h-[64px] mb-2 rounded-[16px]" />
          <Skeleton className="w-16 h-8 rounded-[8px]" />
        </div>
        <Skeleton className="w-[110px] h-[110px] shrink-0 rounded-[24px] bg-[#F7F7F7] border-[3px] border-b-[4px] border-[#E5E5E5]" />
      </div>

      {/* Meaning & Course Usages Skeleton */}
      <div className="bg-white border-[3px] border-b-[6px] border-[#E5E5E5] rounded-[24px] p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Skeleton className="w-20 h-4 rounded-[6px] mb-2" />
          <Skeleton className="w-full h-5 rounded-[8px]" />
          <Skeleton className="w-3/4 h-5 rounded-[8px]" />
        </div>
        
        <div className="flex flex-col gap-2 pt-3 border-t-2 border-[#E5E5E5]">
          <Skeleton className="w-24 h-4 rounded-[6px] mb-2" />
          <div className="flex gap-3 items-start">
            <Skeleton className="w-12 h-5 rounded-[6px] shrink-0" />
            <Skeleton className="w-full h-5 rounded-[8px]" />
          </div>
          <div className="flex gap-3 items-start">
            <Skeleton className="w-12 h-5 rounded-[6px] shrink-0" />
            <Skeleton className="w-2/3 h-5 rounded-[8px]" />
          </div>
        </div>
      </div>

      {/* Components Skeleton */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-row items-center justify-between ml-2">
          <Skeleton className="w-24 h-5 rounded-[8px]" />
          <Skeleton className="w-20 h-5 rounded-[8px]" />
        </div>
        <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full bg-white rounded-[20px] p-3 flex flex-col items-center justify-center border-[3px] border-[#E5E5E5] border-b-[6px] min-h-[120px]">
              <Skeleton className="w-10 h-3 rounded-[4px] mb-2" />
              <Skeleton className="w-12 h-12 rounded-[12px] mb-2" />
              <Skeleton className="w-16 h-3 rounded-[4px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
