import "./globals.css";
import { Inter } from "next/font/google";

/**
 * Inter ≈ Google Sans Text (production-safe)
 */
const googleSans = Inter({
  subsets: ["latin"],
  variable: "--font-google-sans",
  display: "swap",
});

export const metadata = {
  title: "Kinber",
  description: "AI Agent Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={googleSans.variable}
    >
      <body
        className="font-sans antialiased"
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          width: "100%",
          backgroundColor: "#0b0b0c",
          color: "#e5e7eb",
          overflowX: "hidden",

          /* ✅ GLOBAL +2px FONT SIZE */
          fontSize: "16px", // was ~14px → now +2px
          lineHeight: "1.6",
        }}
      >
        {children}
      </body>
    </html>
  );
}
