export const siteConfig = {
  name: 'Kinber',
  url: 'https://kinber.com/',
  description: 'Kinber AI Platform',
  nav: {
    links: [
      {
        title: 'Dashboard',
        href: '/dashboard',
      },
      {
        title: 'Agents',
        href: '/dashboard/agents',
      },
      {
        title: 'Projects',
        href: '/dashboard/projects',
      },
    ]
  },
  links: {
    twitter: 'https://x.com/kinber',
    github: 'https://github.com/AIIJ-Kinber/',
    linkedin: 'https://www.linkedin.com/company/kinber/',
  },
};

export type SiteConfig = typeof siteConfig;