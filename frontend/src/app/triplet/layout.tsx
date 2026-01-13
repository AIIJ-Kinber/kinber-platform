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
      */}
      <div className="w-full max-w-[1400px] mx-auto px-6 py-6">
        {children}
      </div>
    </DashboardLayout>
  );
}
