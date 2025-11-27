'use client';
import { motion } from 'framer-motion';
import { Brain, ShieldCheck, Zap, Layers } from 'lucide-react';

const values = [
  {
    icon: Brain,
    title: 'Intelligent Automation',
    text: 'Deploy agentic workflows that learn, adapt, and respond across Supabase, Playwright, and API integrations.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by Design',
    text: 'End-to-end encryption and granular credential control ensure enterprise-grade security compliance.',
  },
  {
    icon: Zap,
    title: 'Rapid Iteration',
    text: 'Prototype, test, and deploy new agents within hours—not weeks—with our unified developer environment.',
  },
  {
    icon: Layers,
    title: 'Scalable Architecture',
    text: 'Built on modern micro-services with Supabase and Gemini-ready APIs for high-volume workloads.',
  },
];

export function ValueGrid() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">Why Kinber</h2>
        <p className="mt-3 text-white/70">
          Designed for organizations in Jeddah, Dubai, and beyond who demand
          speed, privacy, and reliability from their AI infrastructure.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {values.map((v, i) => (
          <motion.div
            key={v.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
          >
            <v.icon className="h-8 w-8 text-indigo-400" />
            <h3 className="mt-4 text-lg font-medium text-white">{v.title}</h3>
            <p className="mt-2 text-sm text-white/70 leading-relaxed">{v.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
