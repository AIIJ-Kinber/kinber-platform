'use client';

export const dynamic = "force-dynamic";
export const runtime = "edge";

import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Skeleton } from '@/_components/ui/skeleton';
import { cn } from '@/lib/utils';
import DashboardContent from './_components/dashboard-content';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const threadId = searchParams?.get('thread_id');
  const supabase = createClientComponentClient();

  return (
    <div className="relative flex h-screen w-full bg-[#212121] text-gray-100 overflow-hidden">
      <Suspense
        fallback={
          <div className="flex flex-col h-full w-full">
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <div
                className={cn(
                  'flex flex-col items-center text-center w-full space-y-8',
                  'max-w-[850px] sm:max-w-full sm:px-4'
                )}
              >
                <Skeleton className="h-10 w-40 sm:h-8 sm:w-32" />
                <Skeleton className="h-7 w-56 sm:h-6 sm:w-48" />
                <Skeleton className="w-full h-[100px] rounded-xl sm:h-[80px]" />
                <div className="block sm:hidden lg:block w-full">
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </div>
          </div>
        }
      >
        {/* ✅ Pass threadId to your main dashboard content */}
        <DashboardContent threadId={threadId ?? undefined} />
      </Suspense>
    </div>
  );
}
