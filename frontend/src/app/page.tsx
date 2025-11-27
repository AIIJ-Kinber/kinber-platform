'use client';

import { Hero } from "@/_marketing/components/hero";
import { Nav } from "@/_marketing/components/nav";
import { ValueGrid } from "@/_marketing/components/value-grid";
import { SocialProof } from "@/_marketing/components/social-proof";
import { HowItWorks } from "@/_marketing/components/how-it-works";
import { FeatureTable } from "@/_marketing/components/feature-table";
import { SecurityStrip } from "@/_marketing/components/security-strip";
import { CTABand } from "@/_marketing/components/cta-band";
import { Testimonials } from "@/_marketing/components/testimonials";
import { ContactBand } from "@/_marketing/components/contact-band";
import { FadeInSection } from "@/_marketing/components/fade-in-section";

export default function MarketingHome() {
  return (
    <div
      className="relative flex flex-col w-full min-h-screen text-white bg-[#0b0b0c]"
      style={{
        overflowY: "auto",
        overflowX: "hidden",
        scrollBehavior: "smooth",
      }}
    >
      {/* 🧭 Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#0b0b0c]/80 backdrop-blur-md border-b border-white/10">
        <Nav />
      </header>

{/* 💫 Hero Section */}
<FadeInSection>
  <Hero />
</FadeInSection>

{/* 💎 Value Proposition Grid */}
<FadeInSection delay={0.1}>
  <ValueGrid />
</FadeInSection>

{/* 🤝 Social Proof Logos */}
<FadeInSection delay={0.2}>
  <SocialProof />
</FadeInSection>

{/* 💬 Testimonials */}
<FadeInSection delay={0.3}>
  <Testimonials />
</FadeInSection>

{/* ⚙️ How It Works */}
<FadeInSection delay={0.4}>
  <HowItWorks />
</FadeInSection>

{/* 📋 Feature Comparison */}
<FadeInSection delay={0.5}>
  <FeatureTable />
</FadeInSection>

{/* 🔐 Security Strip */}
<FadeInSection delay={0.6}>
  <SecurityStrip />
</FadeInSection>

{/* 🚀 Call To Action Band */}
<FadeInSection delay={0.7}>
  <CTABand />
</FadeInSection>

{/* 📬 Contact Band */}
<FadeInSection delay={0.8}>
  <ContactBand />
</FadeInSection>

      {/* ⚫ Footer */}
      <footer className="border-t border-white/10 mt-24 py-10 text-center text-sm text-white/60 bg-[#0b0b0c]">
        <div className="max-w-6xl mx-auto px-6">
          <p>© {new Date().getFullYear()} Kinber. All rights reserved.</p>
          <div className="mt-3 flex justify-center gap-6 text-white/50 text-xs">
            <a href="#" className="hover:text-white transition">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition">
              Terms of Use
            </a>
            <a href="#" className="hover:text-white transition">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}