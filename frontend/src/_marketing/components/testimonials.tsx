'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';

export function Testimonials() {
  const testimonials = [
    {
      name: 'Aisha Rahman',
      role: 'Head of Data Ops, GulfTech',
      text: 'Kinber has transformed how our AI workflows are deployed. Our agents now move from prototype to production 5× faster, with zero manual glue code.',
      avatar: '/avatars/aisha.jpg',
    },
    {
      name: 'Mohammed Al-Harbi',
      role: 'Founder, SmartWare Jeddah',
      text: 'Finally, a platform that speaks both business and engineering. The team collaboration tools are world-class.',
      avatar: '/avatars/mohammed.jpg',
    },
    {
      name: 'Laura Chen',
      role: 'AI Systems Lead, CloudAxis',
      text: 'Security and audit controls were non-negotiable for us. Kinber delivered that and still gave our developers full creative freedom.',
      avatar: '/avatars/laura.jpg',
    },
  ];

  return (
    <section id="testimonials" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">
          Trusted by forward-thinking teams
        </h2>
        <p className="mt-3 text-white/70">
          From Jeddah to Dubai to Singapore — companies rely on Kinber to power
          secure, scalable AI operations.
        </p>
      </div>

      <div className="grid gap-10 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:bg-white/[0.04] transition"
          >
            <div className="flex items-center gap-4">
              <Image
                src={t.avatar}
                alt={t.name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full border border-white/10 object-cover"
              />
              <div>
                <div className="font-medium text-white">{t.name}</div>
                <div className="text-xs text-white/60">{t.role}</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/70">{t.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
