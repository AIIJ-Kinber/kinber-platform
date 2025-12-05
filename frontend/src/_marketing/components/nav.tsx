'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { createClient } from "@/lib/supabase/client";

export function Nav() {
      const [open, setOpen] = useState(false);
      const [loggedIn, setLoggedIn] = useState(false);

      const supabase = createClient();

      /* ---------------------------------------------------
         🧠 Detect if user is logged in
      ----------------------------------------------------*/
      useEffect(() => {
            supabase.auth.getSession().then(({ data }) => {
                  setLoggedIn(!!data.session?.user);
            });
      }, [supabase]);

      /* ---------------------------------------------------
         🎯 Dynamic target for "Try it Free" button
      ----------------------------------------------------*/
      const tryItHref = loggedIn ? "/welcome" : "/login";

      return (
            <nav className="relative flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
                  
                  {/* Logo */}
                  <Link
                        href="/"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 font-semibold"
                  >
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

                        {/* ⭐ NEW: Try it Free */}
                        <Link
                              href={tryItHref}
                              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
                        >
                              Try it Free
                        </Link>
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
                        <div className="absolute top-full left-0 w-full z-50 bg-[#0b0b0c] border-t border-white/10 flex flex-col items-start p-6 space-y-4 md:hidden animate-fadeIn">

                              <Link
                                    href="#features"
                                    onClick={() => setOpen(false)}
                                    className="text-white/90 hover:text-white"
                              >
                                    Features
                              </Link>

                              <Link
                                    href="#pricing"
                                    onClick={() => setOpen(false)}
                                    className="text-white/90 hover:text-white"
                              >
                                    Pricing
                              </Link>

                              <Link
                                    href="#contact"
                                    onClick={() => setOpen(false)}
                                    className="text-white/90 hover:text-white"
                              >
                                    Contact
                              </Link>

                              {/* ⭐ Mobile: Try it Free */}
                              <Link
                                    href={tryItHref}
                                    onClick={() => setOpen(false)}
                                    className="mt-4 w-full text-center px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
                              >
                                    Try it Free
                              </Link>
                        </div>
                  )}
            </nav>
      );
}
