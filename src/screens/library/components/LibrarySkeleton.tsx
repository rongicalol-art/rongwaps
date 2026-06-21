import React from 'react';

export function LibrarySkeleton() {
  return (
    <div className="w-full pb-8">
      <div className="flex flex-col w-full bg-white border-[2px] border-b-[4px] border-[#E5E5E5] rounded-[16px] overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i, idx) => (
          <div key={`skeleton-${i}`} className={`w-full px-4 py-4 flex flex-row items-center gap-4 ${idx < 5 ? 'border-b-[2px] border-[#F0F0F0]' : ''}`}>
            <div className="flex-1 flex flex-col items-start gap-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-12 bg-[#F0F0F0] rounded-md animate-pulse"></div>
                <div className="h-4 w-16 bg-[#F0F0F0] rounded-md animate-pulse"></div>
              </div>
              <div className="h-3 w-48 bg-[#F0F0F0] rounded-md animate-pulse mt-1"></div>
            </div>
            <div className="w-10 h-10 bg-[#F0F0F0] rounded-xl animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
