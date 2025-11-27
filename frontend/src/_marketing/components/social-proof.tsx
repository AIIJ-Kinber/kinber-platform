'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';

export function SocialProof() {
  const logos = [
    { name: 'Supabase', src: '/logos/supabase.svg' },
    { name: 'Playwright', src: '/logos/playwright.svg' },
    { name: 'OpenAI', src: '/logos/openai.svg' },
    { name: 'Anthropic', src: '/logos/anthropic.svg' },
    { name: 'Tavily', src: '/logos/tavily.svg' },
  ];

  return (
    <section className="border-t border-white/10 bg-white/[0.02] py-14">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <p className="text-sm text-white/60">
          Trusted integrations powering every Kinber agent
        </p>
        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-10 opacity-90"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          {logos.map((logo) => (
            <Image
              key={logo.name}
              src={logo.src}
              alt={logo.name}
              width={100}
              height={40}
              className="h-6 w-auto brightness-125 contrast-125 opacity-70 hover:opacity-100 transition"
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
