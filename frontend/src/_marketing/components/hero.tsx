"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useMotionValue } from "framer-motion";

export function Hero() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  /* 📏 Parallax values */
  const yHeadline = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const yVideo = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.7], [1, 0.4]);
  const gradientMove = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);

  /* 🎮 Cursor-reactive glow */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [windowSize, setWindowSize] = useState({ w: 1, h: 1 });

  React.useEffect(() => {
    const update = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };

  const xPercent = useTransform(mouseX, [0, windowSize.w], ["-30%", "30%"]);
  const yPercent = useTransform(mouseY, [0, windowSize.h], ["-20%", "20%"]);

  const headline = ["Agentic", "workflows", "your", "team", "can", "trust."];

  return (
    <section
      ref={ref}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden cursor-default select-none"
    >
      {/* 🌈 Dynamic gradient that follows scroll + cursor */}
      <motion.div
        style={{
          backgroundPositionY: gradientMove,
          backgroundPositionX: xPercent,
        }}
        animate={{ backgroundPositionX: ["0%", "100%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 bg-[conic-gradient(from_0deg,rgba(79,70,229,0.15)_0deg,rgba(255,255,255,0.08)_180deg,rgba(79,70,229,0.15)_360deg)] blur-3xl opacity-60"
      />

      {/* 🌌 Ambient radial glow following cursor */}
      <motion.div
        style={{
          backgroundPositionX: xPercent,
          backgroundPositionY: yPercent,
        }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.15),transparent_70%)] mix-blend-screen"
      />

      {/* 🪶 Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0b0b0c]" />

      <motion.div
        className="relative z-10 mx-auto max-w-6xl px-6 py-28 lg:py-36"
        style={{ opacity: opacityHero }}
      >
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* ✨ Parallax Headline */}
          <motion.div
            style={{ y: yHeadline, rotateX: 0, rotateY: 0 }}
            whileHover={{ rotateX: -2, rotateY: 2 }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
          >
            <h1 className="text-fluid sm:text-6xl font-extrabold leading-tight tracking-tight">
              {headline.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.6,
                    delay: 0.12 * i,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className="inline-block mr-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-500"
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6 }}
              className="mt-5 text-white/70 max-w-[52ch]"
            >
              Design, run, and observe AI agents with production-grade tooling — 
              Supabase storage, Playwright browsing, and first-class prompt ops.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="mt-8 flex gap-3"
            >
              <Link
              href="/login"
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 transition"
            >
              Start for Free
            </Link>
              <Link
                href="#demo"
                className="rounded-2xl px-5 py-3 border border-white/15 hover:bg-white/5 transition"
              >
                Watch 2-min Demo
              </Link>
            </motion.div>

            <div className="mt-6 text-xs text-white/50">
              Trusted by teams in Jeddah, Dubai & Sharjah
            </div>
          </motion.div>

          {/* 🎞 Parallax / Tilted video */}
          <motion.div
            style={{ y: yVideo }}
            whileHover={{ rotateX: 3, rotateY: -3, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 50, damping: 12 }}
            className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] overflow-hidden"
          >
            <TeaserVideo />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

/* 🎥 Controlled teaser with play button */
function TeaserVideo() {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const handlePlayClick = () => {
    setIsPlaying(true);
    videoRef.current?.play();
  };

  return (
    <div className="relative h-[360px] rounded-xl overflow-hidden border border-white/10">
      {!isPlaying && (
        <Image
          src="/teaser-poster.jpg"
          alt="Kinber teaser poster"
          width={800}
          height={450}
          className="h-full w-full object-cover opacity-95 transition-opacity duration-500"
          priority
        />
      )}

      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover rounded-xl border border-white/10 transition-opacity duration-700 ${
          isPlaying ? "opacity-100" : "opacity-0"
        }`}
        controls
        preload="metadata"
        poster="/teaser-poster.jpg"
      >
        <source src="/teaser.mp4" type="video/mp4" />
      </video>

      {!isPlaying && (
        <motion.button
          onClick={handlePlayClick}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="white"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="none"
              className="w-10 h-10 pl-1"
            >
              <path d="M8.25 4.5v15l11.25-7.5L8.25 4.5z" />
            </svg>
          </div>
        </motion.button>
      )}

      {!isPlaying && (
        <motion.div
          animate={{ x: ["-120%", "120%"] }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-0 left-0 h-full w-[40%] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
        />
      )}
    </div>
  );
}
