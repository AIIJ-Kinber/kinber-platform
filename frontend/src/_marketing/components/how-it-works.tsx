'use client';
import { motion } from 'framer-motion';
import { Workflow, Plug, Rocket } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: Plug,
      title: 'Connect Your Tools',
      text: 'Link Supabase, Playwright, Gemini, and other APIs in seconds—no custom glue code required.',
    },
    {
      icon: Workflow,
      title: 'Design Your Workflow',
      text: 'Build and refine your agentic logic using threads, prompts, and versioned execution pipelines.',
    },
    {
      icon: Rocket,
      title: 'Deploy & Observe',
      text: 'Ship instantly to production and monitor with built-in analytics and retry controls.',
    },
  ];

  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">
          How Kinber Works
        </h2>
        <p className="mt-3 text-white/70">
          From concept to production agent—Kinber unifies every step.
        </p>
      </div>

      <div className="grid gap-10 sm:grid-cols-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center hover:bg-white/[0.04] transition"
          >
            <step.icon className="mx-auto h-10 w-10 text-indigo-400" />
            <h3 className="mt-4 text-lg font-medium text-white">{step.title}</h3>
            <p className="mt-2 text-sm text-white/70 leading-relaxed">{step.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
