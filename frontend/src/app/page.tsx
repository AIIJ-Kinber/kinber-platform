"use client";

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
    <div className="relative flex flex-col w-full min-h-screen text-white bg-[#0b0b0c] overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-[#0b0b0c]/80 backdrop-blur-md border-b border-white/10">
        <Nav />
      </header>

      <FadeInSection><Hero /></FadeInSection>
      <FadeInSection delay={0.1}><ValueGrid /></FadeInSection>
      <FadeInSection delay={0.2}><SocialProof /></FadeInSection>
      <FadeInSection delay={0.3}><Testimonials /></FadeInSection>
      <FadeInSection delay={0.4}><HowItWorks /></FadeInSection>
      <FadeInSection delay={0.5}><FeatureTable /></FadeInSection>
      <FadeInSection delay={0.6}><SecurityStrip /></FadeInSection>
      <FadeInSection delay={0.7}><CTABand /></FadeInSection>
      <FadeInSection delay={0.8}><ContactBand /></FadeInSection>
    </div>
  );
}
