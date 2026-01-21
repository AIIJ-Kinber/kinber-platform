'use client';

import React from 'react';
import DashboardLayout from '../dashboard/layout';

export default function TripletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      {/* 
        Triplet-specific container with scrolling enabled
        This is the main scroll container for the entire page
      */}
      <div className="w-full max-w-[1400px] mx-auto py-6 px-6 overflow-y-auto h-full">
        {children}
      </div>
    </DashboardLayout>
  );
}