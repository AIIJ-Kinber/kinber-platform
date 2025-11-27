'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

export function UseCasesSection() {
  const items = [
    {
      title: 'Intelligent Search',
      description:
        'Search across documents, conversations, and knowledge bases with smart relevance ranking.',
      img: '/images/usecases/search.png',
    },
    {
      title: 'Document Understanding',
      description:
        'Upload legal, financial, or business documents and let Kinber summarize, analyze, and extract insights.',
      img: '/images/usecases/doc-analysis.png',
    },
    {
      title: 'AI Assistants for Teams',
      description:
        'Create specialized AI assistants for operations, HR, finance, education, and more.',
      img: '/images/usecases/team-ai.png',
    },
  ];

  return (
    <section
      id="use-cases"
      className="py-24 bg-background w-full flex items-center justify-center"
    >
      <div className="max-w-6xl w-full px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Powerful Use Cases
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={cn(
                'flex flex-col gap-4 p-6 rounded-xl border border-border bg-muted/20 hover:bg-muted/30 transition-all'
              )}
            >
              <Image
                src={item.img}
                alt={item.title}
                width={600}
                height={400}
                className="w-full h-auto rounded-lg object-cover"
              />

              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="text-muted-foreground text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
