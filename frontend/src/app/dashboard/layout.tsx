// frontend/src/app/dashboard/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { SidebarLeft } from '@/_components/sidebar/sidebar-left';
import { useSidebar } from '@/_components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state } = useSidebar(); // expanded / collapsed
  const [sidebarWidth, setSidebarWidth] = useState('250px');

  // Adjust dynamically when sidebar toggles
  useEffect(() => {
    setSidebarWidth(state === 'collapsed' ? '70px' : '250px');
  }, [state]);

  return (
    <div className="relative flex h-screen w-full bg-[#161616] text-gray-100 overflow-hidden">
      {/* 🟣 Sidebar Wrapper (fixed + scrollable) */}
      <div
        className="
          fixed left-0 top-0 h-full z-30
          overflow-y-auto overflow-x-hidden
          hide-scrollbar transition-all duration-300
        "
        style={{
          width: sidebarWidth,
          backgroundColor: '#252525ff', // same tone as background
        }}
      >
        <SidebarLeft />
      </div>

      {/* ✅ Main Chat Area */}
      <div
        className="
          flex flex-1 flex-col items-center justify-between
          w-full h-full overflow-hidden transition-all duration-300
        "
        style={{
          marginLeft: sidebarWidth,
          backgroundColor: '#252525ff',
        }}
      >
        <div className="flex flex-col justify-between w-full max-w-[950px] h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
