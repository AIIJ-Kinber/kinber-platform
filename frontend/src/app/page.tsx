"use client";

import { Nav } from "@/_marketing/components/nav";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "#0b0b0c", color: "white" }}>
      <Nav />
      <div style={{ padding: 40 }}>
        <h1>Landing OK</h1>
        <p>Nav rendered successfully.</p>
      </div>
    </main>
  );
}
