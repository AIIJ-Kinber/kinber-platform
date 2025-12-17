import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          width: "100%",
          backgroundColor: "#0b0b0c",
          color: "#e5e7eb",
          overflowX: "hidden",
        }}
      >
        {children}
      </body>
    </html>
  );
}
