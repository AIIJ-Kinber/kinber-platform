'use client';
import { motion } from 'framer-motion';

export function ContactBand() {
  return (
    <section className="bg-gradient-to-b from-[#0b0b0c] to-[#121212] border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-semibold text-white sm:text-4xl"
        >
          Let’s build the future with Kinber
        </motion.h2>
        <p className="mt-3 text-white/70 max-w-2xl mx-auto">
          Have questions or want a personalized demo? Reach out to our team or subscribe for updates on new AI-agent tools.
        </p>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-8 flex flex-col sm:flex-row justify-center gap-3 max-w-md mx-auto"
        >
          <input
            type="email"
            required
            placeholder="Enter your email"
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-500 transition"
          >
            Notify Me
          </button>
        </form>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-8 text-white/60 text-sm">
          <div>
            📍 <span className="text-white/80">Jeddah, Saudi Arabia</span>
          </div>
          <div>
            📞 <a href="tel:+966555555555" className="hover:text-white">+966 55 555 5555</a>
          </div>
          <div>
            ✉️ <a href="mailto:contact@kinber.com" className="hover:text-white">contact@kinber.com</a>
          </div>
        </div>
      </div>
    </section>
  );
}
