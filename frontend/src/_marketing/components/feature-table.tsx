'use client';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export function FeatureTable() {
  const features = [
    { name: 'Unlimited Threads', free: true, pro: true },
    { name: 'Supabase Sync', free: true, pro: true },
    { name: 'Gemini Integration', free: false, pro: true },
    { name: 'Playwright Automation', free: false, pro: true },
    { name: 'Private Deployment', free: false, pro: true },
  ];

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">Plans & Features</h2>
        <p className="mt-3 text-white/70">
          Start free, upgrade when you’re ready for production scale.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <table className="w-full text-left text-sm text-white/80">
          <thead>
            <tr className="border-b border-white/10 text-white/60">
              <th className="px-6 py-4">Feature</th>
              <th className="px-6 py-4">Free</th>
              <th className="px-6 py-4">Pro</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <motion.tr
                key={f.name}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                viewport={{ once: true }}
                className="border-b border-white/5"
              >
                <td className="px-6 py-3">{f.name}</td>
                <td className="px-6 py-3">{f.free && <Check className="h-4 w-4 text-indigo-400" />}</td>
                <td className="px-6 py-3">{f.pro && <Check className="h-4 w-4 text-indigo-400" />}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
