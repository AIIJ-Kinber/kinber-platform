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
        Triplet-specific width override
        Sidebar still comes from DashboardLayout
        REMOVED px-6 to prevent padding interference
      */}
      <div className="w-full max-w-[1400px] mx-auto py-6">
        {children}
      </div>
    </DashboardLayout>
  );
}
