'use client';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Database } from 'lucide-react';

export function SecurityStrip() {
  const items = [
    { icon: ShieldCheck, text: 'Role-based Access Control' },
    { icon: Lock, text: 'Encrypted API Credentials' },
    { icon: Database, text: 'Supabase Row-Level Security' },
  ];

  return (
    <section className="border-t border-white/10 bg-white/[0.02] py-12">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-10 px-6">
        {items.map((item, i) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 text-sm text-white/70"
          >
            <item.icon className="h-5 w-5 text-indigo-400" />
            <span>{item.text}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
