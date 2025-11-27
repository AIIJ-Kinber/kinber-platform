'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function CTABand() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 text-center">
      <motion.h2
        className="text-3xl font-semibold text-white sm:text-4xl"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        Ready to build your next AI agent?
      </motion.h2>
      <p className="mt-4 text-white/70">
        Kinber helps you go from concept to production seamlessly.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/dashboard"
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_30px_rgba(79,70,229,0.35)] hover:bg-indigo-700 transition"
        >
          Get Started
        </Link>
        <Link
          href="#"
          className="rounded-xl border border-white/15 px-5 py-3 text-sm text-white/80 hover:bg-white/10 transition"
        >
          Contact Sales
        </Link>
      </div>
    </section>
  );
}
