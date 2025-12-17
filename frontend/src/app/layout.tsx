import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { Providers } from "./providers";
import { ThemeProvider } from "@/_components/home/theme-provider";
import { AuthProvider } from "@/_components/AuthProvider";
import { SidebarProvider } from "@/_components/ui/sidebar";
import { Toaster } from "@/_components/ui/sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import { siteConfig } from "@/lib/site";

// --------------------
// Fonts
// --------------------
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// --------------------
// Metadata
// --------------------
export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0c",
};

// --------------------
// Root Layout (NO auth here)
// --------------------
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        {/* Google Tag Manager */}
        <Script
          id="gtm"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){
                w[l]=w[l]||[];
                w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
                var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
                j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;
                f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-PCHSN4M2');
            `,
          }}
        />

        {/* Google Identity (Drive Picker, OAuth helpers) */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />

        {/* Tolt */}
        <Script
          async
          src="https://cdn.tolt.io/tolt.js"
          data-tolt={process.env.NEXT_PUBLIC_TOLT_REFERRAL_ID}
        />
      </head>

      <body
        className="font-sans antialiased"
        style={{
          margin: 0,
          padding: 0,
          width: "100vw",
          minHeight: "100vh",
          backgroundColor: "#0b0b0c",
          color: "#e5e7eb",
          overflow: "hidden",
        }}
      >
        {/* NoScript GTM */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PCHSN4M2"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        {/* App Providers */}
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

        {/* Portal root */}
        <div id="modal-root" />
      </body>
    </html>
  );
}
