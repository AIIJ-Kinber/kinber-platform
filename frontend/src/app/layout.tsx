import { ThemeProvider } from '@/_components/home/theme-provider';
import { AuthProvider } from '@/_components/AuthProvider';
import { SidebarProvider } from '@/_components/ui/sidebar';
import { siteConfig } from '@/lib/site';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers'; // React Query Provider
import { Toaster } from '@/_components/ui/sonner';
import { GoogleAnalytics } from '@next/third-parties/google';

// ✅ NEW: Supabase SSR for server-side session (Safe + Recommended)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

// =======================
// Metadata
// =======================
export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

export const viewport: Viewport = {
  themeColor: '#2a2a2a',
  width: 'device-width',
  initialScale: 1,
};

// =======================
// Root Layout (Server Component)
// =======================
export default async function RootLayout({ children }: { children: React.ReactNode }) {

// ----------------------------------------------
// ✅ Create Supabase Server Client (Next.js 15 SAFE)
// ----------------------------------------------
const cookieStore = await cookies();
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  }
);

// Force-refresh Supabase session (safe)
try {
  await supabase.auth.getSession();
} catch {
  // swallow errors – never crash layout
}


  // ----------------------------------------------
  // Layout continues normally...
  // ----------------------------------------------
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{
        backgroundColor: '#2a2a2a',
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
      }}
    >
      <head>
        {/* Google Tag Manager */}
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){
                w[l]=w[l]||[];
                w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
                var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s), dl=l!='dataLayer'?'&l='+l:'';
                j.async=true;
                j.src='https://www.googletagmanager.com/gtm.js?id=' + i + dl;
                f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-PCHSN4M2');
            `,
          }}
        />

        {/* Tolt Script */}
        <Script
          async
          src="https://cdn.tolt.io/tolt.js"
          data-tolt={process.env.NEXT_PUBLIC_TOLT_REFERRAL_ID}
        />

        {/* ✅ Google Identity Services (REQUIRED for Drive Picker tokens) */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </head>


      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        style={{
          margin: 0,
          padding: 0,
          width: '100vw',
          minHeight: '100vh',
          backgroundColor: '#2a2a2a',
          color: '#e5e7eb',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* NoScript GTM */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PCHSN4M2"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

        {/* App Container */}
        <div
          className="flex h-screen w-screen overflow-hidden"
          style={{ backgroundColor: '#2a2a2a', flex: 1 }}
        >
          <Providers>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <AuthProvider>
                <SidebarProvider>
                  {children}
                  <Toaster />
                </SidebarProvider>
              </AuthProvider>
              <GoogleAnalytics gaId="G-6ETJFB3PT3" />
            </ThemeProvider>
          </Providers>
        </div>

        {/* Modal Root */}
        <div id="modal-root" />
      </body>
    </html>
  );
}
