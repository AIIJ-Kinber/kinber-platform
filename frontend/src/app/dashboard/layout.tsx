'use client';

import React, { useEffect, useState } from 'react';
import { SidebarLeft } from '@/_components/sidebar/sidebar-left';
import { useSidebar } from '@/_components/ui/sidebar';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import ClientLayout from '../client-layout';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // -------------------------------------------------------
  // MUST BE FIRST
  // -------------------------------------------------------
  const supabase = createClient();
  const router = useRouter();
  const { state } = useSidebar();
  const pathname = usePathname();

  // Local state (hooks must be at top)
  const [sidebarWidth, setSidebarWidth] = useState('250px');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // -------------------------------------------------------
  // 1) AUTH CHECK — always runs as a hook, never conditionally
  // -------------------------------------------------------
  useEffect(() => {
    const verify = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    verify();
  }, [supabase]);

  // -------------------------------------------------------
  // 2) SIDEBAR ANIMATION — also always runs as a hook
  // -------------------------------------------------------
  useEffect(() => {
    setSidebarWidth(state === 'collapsed' ? '70px' : '250px');
  }, [state]);

  // -------------------------------------------------------
  // ⚠️ CONDITIONAL UI RETURNS (AFTER ALL HOOKS)
  // -------------------------------------------------------

  // Still loading?
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#161616] text-gray-100">
        <div className="animate-spin h-10 w-10 border-b-2 border-white rounded-full" />
      </div>
    );
  }

  // Not authorized?
  if (!authorized) {
    router.replace('/login');
    return null;
  }

  // -------------------------------------------------------
  // MAIN LAYOUT (SAFE)
  // -------------------------------------------------------
  return (
    <ClientLayout>
      <div id="modal-root" />
      <div className="relative flex h-screen w-full bg-[#161616] text-gray-100 overflow-hidden">

        {/* Sidebar */}
        <div
          className="
            fixed left-0 top-0 h-full z-30
            overflow-y-auto overflow-x-hidden
            hide-scrollbar transition-all duration-300
          "
          style={{
            width: sidebarWidth,
            backgroundColor: '#252525',
          }}
        >
          <SidebarLeft />
        </div>

        {/* Main Content */}
        <div
          className="
            flex flex-1 flex-col items-center justify-between
            w-full h-full overflow-hidden transition-all duration-300
          "
          style={{
            marginLeft: sidebarWidth,
            backgroundColor: '#252525',
          }}
        >
          <div
            className={`
              flex flex-col justify-between w-full h-full
              ${pathname.startsWith('/triplet')
                ? 'max-w-none px-8'
                : 'max-w-[950px]'
              }
            `}
          >
            {children}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
