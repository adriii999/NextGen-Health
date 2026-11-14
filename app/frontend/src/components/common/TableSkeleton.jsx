// src/components/common/TableSkeleton.jsx
import React from 'react';

export const TableSkeleton = ({ rows = 4 }) => {
  return (
    <div className="divide-y divide-[#E3E6EB] animate-pulse">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex items-center justify-between p-3.5 bg-white">
          <div className="space-y-1.5 w-44">
            <div className="h-3.5 bg-[#E3E6EB] rounded-[4px] w-32" />
            <div className="h-2.5 bg-[#F0F2F5] rounded-[4px] w-24" />
          </div>
          <div className="h-4 bg-[#F0F2F5] rounded-[4px] w-16" />
          <div className="h-4 bg-[#E3E6EB] rounded-[4px] w-20" />
          <div className="h-4 bg-[#E3E6EB] rounded-[4px] w-16" />
          <div className="h-4 bg-[#F0F2F5] rounded-[4px] w-16" />
          <div className="h-4 bg-[#E3E6EB] rounded-[4px] w-24" />
          <div className="h-3.5 bg-[#F0F2F5] rounded-[4px] w-56" />
          <div className="h-7 bg-[#E3E6EB] rounded-[6px] w-20" />
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;
