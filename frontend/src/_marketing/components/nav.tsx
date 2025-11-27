'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="relative flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
      
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <Image
          src="/black_logo.png"
          alt="Kinber"
          width={120}
          height={32}
          className="h-7 w-auto"
          priority
        />
      </Link>

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-8 text-sm text-white/80">
        <Link href="#features" className="hover:text-white">Features</Link>
        <Link href="#pricing" className="hover:text-white">Pricing</Link>
        <Link href="#contact" className="hover:text-white">Contact</Link>
      </div>

      {/* Mobile toggle button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle menu"
        className="md:hidden text-white/80 hover:text-white transition"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="absolute top-full left-0 w-full bg-[#0b0b0c] border-t border-white/10 flex flex-col items-start p-6 space-y-4 md:hidden">
          <Link href="#features" onClick={() => setOpen(false)} className="text-white/90 hover:text-white">
            Features
          </Link>
          <Link href="#pricing" onClick={() => setOpen(false)} className="text-white/90 hover:text-white">
            Pricing
          </Link>
          <Link href="#contact" onClick={() => setOpen(false)} className="text-white/90 hover:text-white">
            Contact
          </Link>
        </div>
      )}
    </nav>
  );
}
