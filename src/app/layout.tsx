import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "TimeTap — Workforce Management",
  description: "Premium workforce management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body bg-background text-foreground antialiased min-h-screen">
        <ThemeProvider>
          {children}
          <Toaster theme="dark" richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
