const useCases = [
  {
    id: "documentation",
    title: "Documentation",
    description: "Create comprehensive documentation and guides",
    category: "productivity",
    featured: true,
    icon: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>,
    image: "/images/documentation.png",
    url: "/getting-started",
  },
  {
    id: "features",
    title: "Features",
    description: "Explore platform capabilities and tools",
    category: "platform",
    featured: true,
    icon: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>,
    image: "/images/features.png",
    url: "/features",
  },
  {
    id: "analytics",
    title: "Analytics",
    description: "Track performance and gain insights",
    category: "analytics",
    featured: true,
    icon: <path d="M18 20V10M12 20V4M6 20v-6"></path>,
    image: "/images/analytics.png",
    url: "/analytics",
  },
  {
    id: "support",
    title: "Support",
    description: "Get help and technical assistance",
    category: "support",
    featured: true,
    icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path>,
    image: "/images/support.png",
    url: "/support",
  },
];

export const siteConfig = {
  name: "Kinber",
  description:
    "Your intelligent AI agent platform for enhanced productivity and automation.",

  nav: [
    { title: "Home", href: "/" },
    { title: "Features", href: "/features" },
    { title: "Getting Started", href: "/getting-started" },
    { title: "Support", href: "/support" },
  ],

  links: {
    github: "https://github.com/kinber-platform",
    twitter: "https://twitter.com/kinber",
  },

  // Use cases (for home page)
  useCases: useCases,

  // CTA section
  ctaSection: {
    title: "Get started with Kinber",
    button: {
      href: "/dashboard",
      text: "Start Now",
    },
    subtext: "Your AI-powered assistant workspace.",
  },

  // FAQ Section
  faqSection: {
    title: "Frequently Asked Questions",
    description: "Find answers to common questions about Kinber.",
    faQitems: [
      {
        question: "What is Kinber?",
        answer:
          "Kinber is an AI agent platform that helps you automate tasks and improve productivity.",
      },
      {
        question: "Do I need technical skills to use Kinber?",
        answer:
          "No. Kinber is designed to be user-friendly for everyone, including non-technical users.",
      },
      {
        question: "Is Kinber free to use?",
        answer: "Yes, Kinber offers a free tier with optional paid upgrades.",
      },
    ],
  },

  // NEW — Feature Section (required by FeatureSection component)
  featureSection: {
    title: "Powerful Features",
    description: "Explore the tools and capabilities that make Kinber unique.",
    items: [
      {
        id: "agents",
        title: "Custom AI Agents",
        description: "Build and personalize AI agents for any workflow.",
        image: "/images/feature-agents.png",
      },
      {
        id: "automation",
        title: "Automation Engine",
        description: "Automate tasks, workflows, and business processes.",
        image: "/images/feature-automation.png",
      },
      {
        id: "integrations",
        title: "Integrations",
        description: "Connect Kinber to external apps and services.",
        image: "/images/feature-integrations.png",
      },
    ],
  },

    footerLinks: {
    company: [
      { title: "About Us", href: "/about" },
      { title: "Careers", href: "/careers" },
      { title: "Contact", href: "/contact" },
    ],
    product: [
      { title: "Features", href: "/features" },
      { title: "Integrations", href: "/integrations" },
      { title: "Pricing", href: "/pricing" },
    ],
    resources: [
      { title: "Documentation", href: "/getting-started" },
      { title: "Support", href: "/support" },
      { title: "FAQ", href: "/faq" },
    ],
    legal: [
      { title: "Terms of Service", href: "/legal/terms" },
      { title: "Privacy Policy", href: "/legal/privacy" },
      { title: "Cookies", href: "/legal/cookies" },
    ],
  },

  growthSection: {
  title: "Grow Faster With Kinber",
  description: "Scale your workflows, automate tedious tasks, and boost productivity.",
  stats: [
    { id: "automation", label: "Automation Speed", value: "10x faster" },
    { id: "time_saved", label: "Time Saved", value: "Up to 70%" },
    { id: "agents", label: "AI Agents Available", value: "20+ presets" },
  ],
},

  // Optional (disabled by you earlier)
  // bentoSection: {
  //   title: "Modern Workflows",
  //   description: "Powerful modular building blocks.",
  //   items: [],
  // },
};

export { useCases };
