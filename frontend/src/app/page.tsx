"use client";

import { Nav } from "@/_marketing/components/nav";
import { Hero } from "@/_marketing/components/hero";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "#0b0b0c", color: "white" }}>
      <Nav />
      <Hero />
    </main>
  );
}
