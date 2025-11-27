'use client';

import { cn } from '@/lib/utils';

export function QuoteSection() {
  return (
    <section
      id="quote"
      className={cn(
        'w-full py-24 bg-background flex items-center justify-center text-center'
      )}
    >
      <div className="max-w-3xl px-6">
        <p className="text-2xl md:text-3xl font-semibold leading-relaxed">
          “The future belongs to those who augment human capability with
          intelligent systems — empowering people, teams, and organizations
          to achieve more than ever before.”
        </p>

        <p className="mt-6 text-sm text-muted-foreground">
          — Kinber AI Initiative
        </p>
      </div>
    </section>
  );
}
